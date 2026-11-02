import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { type InsertTripStop, tripStopTable, tripTable } from "../../db/schemas/trip.schema.ts";

export type TripTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TripStopValues = Required<
  Pick<
    InsertTripStop,
    | "mapboxId"
    | "name"
    | "streetAddress"
    | "areaAddress"
    | "category"
    | "latitude"
    | "longitude"
    | "position"
  >
>;

// Populate the saved trip list by loading the user's active trips, newest first.
export const findActiveTrips = (userId: number) =>
  db
    .select()
    .from(tripTable)
    .where(and(eq(tripTable.userId, userId), isNull(tripTable.deletedAt)))
    .orderBy(desc(tripTable.createdAt), desc(tripTable.id));

// Avoid a separate stop query per trip by loading all requested trips' active stops in position order.
export const findActiveStopsForTrips = async (tripIds: number[]) => {
  if (tripIds.length === 0) return [];
  return db
    .select()
    .from(tripStopTable)
    .where(and(inArray(tripStopTable.tripId, tripIds), isNull(tripStopTable.deletedAt)))
    .orderBy(asc(tripStopTable.position));
};

// Keep stop syncing and save responses in the same transaction by loading the trip's active stops.
export const findActiveTripStops = (tx: TripTransaction, tripId: number) =>
  tx
    .select()
    .from(tripStopTable)
    .where(and(eq(tripStopTable.tripId, tripId), isNull(tripStopTable.deletedAt)));

// Restrict edits to the owner and prevent overlapping saves by locking their active trip.
export const findOwnedTripForUpdate = async (
  tx: TripTransaction,
  userId: number,
  publicId: string,
) => {
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
    .limit(1)
    .for("update");
  return trip;
};

// Start a saved itinerary by inserting its owner and name and returning the new trip.
export const insertTrip = async (tx: TripTransaction, userId: number, name: string) => {
  const [trip] = await tx.insert(tripTable).values({ userId, name }).returning();
  return trip;
};

// Make saved changes detectable by updating the trip name, version, and modification time.
export const updateTripDetails = async (tx: TripTransaction, tripId: number, name: string) => {
  const [trip] = await tx
    .update(tripTable)
    .set({ name, version: sql`${tripTable.version} + 1`, updatedAt: new Date() })
    .where(eq(tripTable.id, tripId))
    .returning();
  return trip;
};

// Keep new stop saves efficient by inserting the trip's added stops in one query.
export const insertTripStops = async (
  tx: TripTransaction,
  tripId: number,
  stops: TripStopValues[],
) => {
  if (stops.length === 0) return [];
  return tx
    .insert(tripStopTable)
    .values(stops.map((stop) => ({ ...stop, tripId })))
    .returning();
};

// Keep large edits and reorders efficient by updating all changed stops in one query.
export const updateTripStops = async (
  tx: TripTransaction,
  tripId: number,
  stops: (TripStopValues & { publicId: string })[],
) => {
  if (stops.length === 0) return;
  const rows = stops.map(
    (stop) => sql`(
    ${stop.publicId}::uuid, ${stop.mapboxId}::text, ${stop.name}::text,
    ${stop.streetAddress}::text, ${stop.areaAddress}::text, ${stop.category}::text,
    ${stop.latitude}::double precision, ${stop.longitude}::double precision,
    ${stop.position}::integer
  )`,
  );
  await tx.execute(sql`
    UPDATE ${tripStopTable} AS target SET
      mapbox_id = changes.mapbox_id,
      name = changes.name,
      street_address = changes.street_address,
      area_address = changes.area_address,
      category = changes.category,
      latitude = changes.latitude,
      longitude = changes.longitude,
      position = changes.position,
      updated_at = now()
    FROM (VALUES ${sql.join(rows, sql`, `)}) AS changes(
      public_id, mapbox_id, name, street_address, area_address, category,
      latitude, longitude, position
    )
    WHERE target.trip_id = ${tripId}
      AND target.public_id = changes.public_id
      AND target.deleted_at IS NULL
  `);
};

// Preserve stop records when removed from a trip by marking them deleted.
export const softDeleteTripStops = async (
  tx: TripTransaction,
  tripId: number,
  publicIds: string[],
) => {
  if (publicIds.length === 0) return;
  const deletedAt = new Date();
  await tx
    .update(tripStopTable)
    .set({ deletedAt, updatedAt: deletedAt })
    .where(and(eq(tripStopTable.tripId, tripId), inArray(tripStopTable.publicId, publicIds)));
};
