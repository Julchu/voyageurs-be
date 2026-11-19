import { randomUUID } from "node:crypto";
import { db } from "../../db";
import { badRequest, conflict, notFound } from "../../lib/errors.ts";
import { saveCalendar } from "./trip.calendar.ts";
import { toTripDto } from "./trip.mapper.ts";
import {
  findTrip,
  findTrips,
  insertStops,
  insertTrip,
  lockTrip,
  moveStops,
  removeStops,
  saveTrip,
  type TripChanges,
  type TripRow,
  type Tx,
  upsertPlaces,
} from "./trip.queries.ts";
import { assertChronological, visitOf } from "./trip.schedule.ts";
import type { CreateTripInput, StopInput, TripPatch } from "./trip.validation.ts";

type StopIdMap = Record<string, string>;

/** What a save scope changed on the trip row, and the IDs of stops it created. */
export type SaveResult = { trip?: TripChanges; stopIdMap?: StopIdMap };

export const listTrips = async (userId: number) => (await findTrips(userId)).map(toTripDto);

// Must match the frontend's placeKey.
const placeKey = ({ mapboxId, coordinates }: Pick<StopInput, "mapboxId" | "coordinates">) =>
  mapboxId ?? `${coordinates.lat},${coordinates.lng}`;

/** Inserts stops at their positions, reusing the trip's places; maps client IDs to new IDs. */
const addStops = async (
  tx: Tx,
  tripId: number,
  stops: (StopInput & { position: number })[],
): Promise<StopIdMap> => {
  const placeIds = await upsertPlaces(
    tx,
    tripId,
    stops.map(({ coordinates, ...stop }) => ({
      placeKey: placeKey({ ...stop, coordinates }),
      mapboxId: stop.mapboxId,
      name: stop.name,
      streetAddress: stop.streetAddress,
      areaAddress: stop.areaAddress,
      category: stop.category,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    })),
  );
  const added = stops.map((stop) => ({ ...stop, publicId: randomUUID() }));
  await insertStops(
    tx,
    tripId,
    added.map((stop) => ({
      publicId: stop.publicId,
      position: stop.position,
      placeId: placeIds.get(placeKey(stop))!,
    })),
  );
  return Object.fromEntries(
    added.flatMap(({ clientId, publicId }) => (clientId ? [[clientId, publicId]] : [])),
  );
};

/** The drawer sends its full list: saved stops move, new ones are added, missing ones removed. */
const saveDrawer = async (
  tx: Tx,
  trip: TripRow,
  { name, stops }: TripPatch,
): Promise<SaveResult> => {
  if (!stops) return { trip: { name } };

  const saved = new Map(trip.stops.map((stop) => [stop.publicId, stop]));
  const kept = new Set(stops.flatMap((stop) => stop.publicId ?? []));
  if ([...kept].some((id) => !saved.has(id)))
    throw badRequest("A stop does not belong to this trip");
  assertChronological(
    stops.map(({ publicId }) => (publicId ? visitOf(saved.get(publicId)!) : undefined)),
  );

  await removeStops(
    tx,
    trip.id,
    [...saved.keys()].filter((id) => !kept.has(id)),
  );
  await moveStops(
    tx,
    trip.id,
    stops.flatMap(({ publicId }, position) =>
      publicId && saved.get(publicId)?.position !== position ? [{ publicId, position }] : [],
    ),
  );
  const stopIdMap = await addStops(
    tx,
    trip.id,
    stops.flatMap((stop, position) => (stop.publicId ? [] : [{ ...stop, position }])),
  );
  return { trip: { name }, stopIdMap };
};

const saveScope = (tx: Tx, trip: TripRow, patch: TripPatch): Promise<SaveResult> => {
  if (patch.calendar) return saveCalendar(tx, trip, patch.calendar);
  return saveDrawer(tx, trip, patch);
};

export const createTrip = (userId: number, { name, stops }: CreateTripInput) =>
  db.transaction(async (tx) => {
    const { id } = await insertTrip(tx, { userId, name });
    const stopIdMap = await addStops(
      tx,
      id,
      stops.map((stop, position) => ({ ...stop, position })),
    );
    return { ...toTripDto(await findTrip(tx, id)), stopIdMap };
  });

export const updateTrip = (userId: number, publicId: string, patch: TripPatch) =>
  db.transaction(async (tx) => {
    const locked = await lockTrip(tx, userId, publicId);
    if (!locked) throw notFound("Trip not found");
    if (locked.version !== patch.version)
      throw conflict(
        "This trip changed elsewhere. Reload and restore the latest saved trip before editing.",
      );

    const result = await saveScope(tx, await findTrip(tx, locked.id), patch);
    await saveTrip(tx, locked.id, result.trip ?? {});
    return { ...toTripDto(await findTrip(tx, locked.id)), stopIdMap: result.stopIdMap ?? {} };
  });
