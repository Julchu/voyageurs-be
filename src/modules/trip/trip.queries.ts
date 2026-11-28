import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  type InsertTrip,
  type InsertTripPlace,
  type SelectTripStop,
  tripPlaceTable,
  tripStopTable,
  tripTable,
} from "../../db/schemas/trip.schema.ts";
import { recordset, single } from "../../db/utils/sql.ts";
import type { AvailabilityWindow } from "./trip.types.ts";
import type { PlaceDetailsInput } from "./trip.validation.ts";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Active stops in list order, each with its place.
const activeStops = {
  stops: {
    where: { deletedAt: { isNull: true } },
    orderBy: { position: "asc" },
    with: { place: true },
  },
} as const;

export const findTrips = (userId: number) =>
  db.query.tripTable.findMany({
    where: { userId, deletedAt: { isNull: true } },
    orderBy: { createdAt: "desc", id: "desc" },
    with: activeStops,
  });

export const findTrip = async (tx: Tx, id: number) => {
  const trip = await tx.query.tripTable.findFirst({ where: { id }, with: activeStops });
  if (!trip) throw new Error("Trip not found");
  return trip;
};

export type TripRow = Awaited<ReturnType<typeof findTrip>>;
export type StopRow = TripRow["stops"][number];

/** Locks the owner's trip so overlapping saves run one at a time. */
export const lockTrip = async (tx: Tx, userId: number, publicId: string) => {
  const [trip] = await tx
    .select()
    .from(tripTable)
    .where(
      and(
        eq(tripTable.publicId, publicId),
        eq(tripTable.userId, userId),
        isNull(tripTable.deletedAt),
      ),
    )
    .for("update");
  return trip;
};

/** Soft-deletes the owner's trip; returns it, or undefined when no active trip matched. */
export const softDeleteTrip = async (userId: number, publicId: string) => {
  const [trip] = await db
    .update(tripTable)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(tripTable.publicId, publicId),
        eq(tripTable.userId, userId),
        isNull(tripTable.deletedAt),
      ),
    )
    .returning({ publicId: tripTable.publicId });
  return trip;
};

export const insertTrip = (tx: Tx, values: Pick<InsertTrip, "userId" | "name">) =>
  tx.insert(tripTable).values(values).returning().then(single);

export type TripChanges = Partial<Omit<InsertTrip, "id" | "publicId" | "userId" | "version">>;

/** Applies a save's trip-level changes and bumps the version. */
export const saveTrip = (tx: Tx, id: number, changes: TripChanges) =>
  tx
    .update(tripTable)
    .set({ ...changes, version: sql`${tripTable.version} + 1` })
    .where(eq(tripTable.id, id));

type NewPlace = Pick<
  InsertTripPlace,
  | "placeKey"
  | "mapboxId"
  | "name"
  | "streetAddress"
  | "areaAddress"
  | "category"
  | "latitude"
  | "longitude"
>;

/** The trip's place ID for each key, creating missing places so each keeps one set of details. */
export const upsertPlaces = async (tx: Tx, tripId: number, places: NewPlace[]) => {
  if (!places.length) return new Map<string, number>();

  const unique = [...new Map(places.map((place) => [place.placeKey, place])).values()];
  await tx
    .insert(tripPlaceTable)
    .values(unique.map((place) => ({ ...place, tripId })))
    .onConflictDoNothing({ target: [tripPlaceTable.tripId, tripPlaceTable.placeKey] });

  const rows = await tx
    .select({ id: tripPlaceTable.id, placeKey: tripPlaceTable.placeKey })
    .from(tripPlaceTable)
    .where(
      and(
        eq(tripPlaceTable.tripId, tripId),
        inArray(
          tripPlaceTable.placeKey,
          unique.map((place) => place.placeKey),
        ),
      ),
    );
  return new Map(rows.map((row) => [row.placeKey, row.id]));
};

/** Updates each place in one statement; returns how many belong to the trip. */
export const updatePlaceDetails = async (tx: Tx, tripId: number, places: PlaceDetailsInput) => {
  if (!places.length) return 0;
  const updated = await tx.execute(sql`
    UPDATE ${tripPlaceTable} SET
      category = changes.category, type = changes.type, details = changes.details,
      notes = changes.notes, url = changes.url, reservations = changes.reservations,
      price = changes.price, updated_at = now()
    FROM ${recordset(
      places,
      sql`"publicId" uuid, category text, type text, details text, notes text, url text,
        reservations reservation, price numeric`,
    )}
    WHERE ${tripPlaceTable.tripId} = ${tripId} AND ${tripPlaceTable.publicId} = changes."publicId"
    RETURNING ${tripPlaceTable.id}
  `);
  return updated.length;
};

export const insertStops = async (
  tx: Tx,
  tripId: number,
  stops: { publicId: string; placeId: number; position: number }[],
) => {
  if (stops.length)
    await tx.insert(tripStopTable).values(stops.map((stop) => ({ ...stop, tripId })));
};

export const moveStops = async (
  tx: Tx,
  tripId: number,
  stops: { publicId: string; position: number }[],
) => {
  if (!stops.length) return;
  await tx.execute(sql`
    UPDATE ${tripStopTable} SET position = changes.position, updated_at = now()
    FROM ${recordset(stops, sql`"publicId" uuid, position integer`)}
    WHERE ${tripStopTable.tripId} = ${tripId} AND ${tripStopTable.publicId} = changes."publicId"
  `);
};

export const removeStops = async (tx: Tx, tripId: number, publicIds: string[]) => {
  if (!publicIds.length) return;
  await tx
    .update(tripStopTable)
    .set({ deletedAt: new Date() })
    .where(and(eq(tripStopTable.tripId, tripId), inArray(tripStopTable.publicId, publicIds)));
};

type StopPlan = Pick<
  SelectTripStop,
  "publicId" | "position" | "slotDate" | "slotStart" | "slotEnd" | "slotLocked"
>;

/** Saves list positions and slots together, in one statement. */
export const saveStopPlans = async (tx: Tx, tripId: number, stops: StopPlan[]) => {
  if (!stops.length) return;
  await tx.execute(sql`
    UPDATE ${tripStopTable} SET
      position = changes.position, slot_date = changes."slotDate",
      slot_start = changes."slotStart", slot_end = changes."slotEnd",
      slot_locked = changes."slotLocked", updated_at = now()
    FROM ${recordset(
      stops,
      sql`"publicId" uuid, position integer, "slotDate" date, "slotStart" smallint,
        "slotEnd" smallint, "slotLocked" boolean`,
    )}
    WHERE ${tripStopTable.tripId} = ${tripId} AND ${tripStopTable.publicId} = changes."publicId"
  `);
};

export const savePlaceHours = async (
  tx: Tx,
  tripId: number,
  places: { id: number; availability: AvailabilityWindow[] }[],
) => {
  if (!places.length) return;
  await tx.execute(sql`
    UPDATE ${tripPlaceTable} SET availability = changes.availability, updated_at = now()
    FROM ${recordset(places, sql`id integer, availability jsonb`)}
    WHERE ${tripPlaceTable.tripId} = ${tripId} AND ${tripPlaceTable.id} = changes.id
  `);
};
