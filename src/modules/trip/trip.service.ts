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
  softDeleteTrip,
  type TripChanges,
  type TripRow,
  type Tx,
  updatePlaceDetails,
  upsertPlaces,
} from "./trip.queries.ts";
import { assertChronological, timeSlotOf } from "./trip.schedule.ts";
import type {
  CreateTripInput,
  NewStopInput,
  PlaceDetailsInput,
  TripPatch,
} from "./trip.validation.ts";

type StopIdMap = Record<string, string>;

/** What a save scope changed on the trip row, and the IDs of stops it created. */
type SaveResult = { trip?: TripChanges; stopIdMap?: StopIdMap };

export const listTrips = async (userId: number) => (await findTrips(userId)).map(toTripDto);

// Must match the frontend's placeKey.
const placeKey = ({ mapboxId, coordinates }: NewStopInput) =>
  mapboxId ?? `${coordinates.lat},${coordinates.lng}`;

/** Inserts stops at their positions, reusing the trip's places; maps client IDs to new IDs. */
const addStops = async (
  tx: Tx,
  tripId: number,
  stops: (NewStopInput & { position: number })[],
): Promise<StopIdMap> => {
  const added = stops.map((stop) => ({ ...stop, key: placeKey(stop), publicId: randomUUID() }));
  const placeIds = await upsertPlaces(
    tx,
    tripId,
    added.map(({ key, coordinates, ...stop }) => ({
      placeKey: key,
      mapboxId: stop.mapboxId,
      name: stop.name,
      streetAddress: stop.streetAddress,
      areaAddress: stop.areaAddress,
      category: stop.category,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
    })),
  );
  await insertStops(
    tx,
    tripId,
    added.map(({ key, publicId, position }) => {
      const placeId = placeIds.get(key);
      if (placeId === undefined) throw new Error("A new stop's place was not saved");
      return { publicId, position, placeId };
    }),
  );
  return Object.fromEntries(added.map(({ clientId, publicId }) => [clientId, publicId]));
};

/** The drawer sends its full list: saved stops move, new ones are added, missing ones removed. */
const saveDrawer = async (
  tx: Tx,
  trip: TripRow,
  { name, stops }: Extract<TripPatch, { scope: "drawer" }>,
): Promise<SaveResult> => {
  if (!stops) return { trip: { name } };

  // The saved row for each listed stop, undefined for new ones; a foreign ID fails here.
  const saved = new Map(trip.stops.map((stop) => [stop.publicId, stop]));
  const rows = stops.map((stop) => {
    if (!("publicId" in stop)) return undefined;
    const row = saved.get(stop.publicId);
    if (!row) throw badRequest("A stop does not belong to this trip");
    return row;
  });
  assertChronological(rows.map((row) => row && timeSlotOf(row)));

  const kept = new Set(rows.flatMap((row) => row?.publicId ?? []));
  await removeStops(
    tx,
    trip.id,
    [...saved.keys()].filter((id) => !kept.has(id)),
  );
  await moveStops(
    tx,
    trip.id,
    rows.flatMap((row, position) =>
      row && row.position !== position ? [{ publicId: row.publicId, position }] : [],
    ),
  );
  const stopIdMap = await addStops(
    tx,
    trip.id,
    stops.flatMap((stop, position) => ("publicId" in stop ? [] : [{ ...stop, position }])),
  );
  return { trip: { name }, stopIdMap };
};

/** The stops table saves details per place, so every stop there shows them. */
const savePlaceDetails = async (
  tx: Tx,
  tripId: number,
  places: PlaceDetailsInput,
): Promise<SaveResult> => {
  const updated = await updatePlaceDetails(tx, tripId, places);
  if (updated !== places.length) throw badRequest("A place does not belong to this trip");
  return {};
};

const saveScope = (tx: Tx, trip: TripRow, patch: TripPatch): Promise<SaveResult> => {
  switch (patch.scope) {
    case "drawer":
      return saveDrawer(tx, trip, patch);
    case "details":
      return savePlaceDetails(tx, trip.id, patch.placeDetails);
    case "calendar":
      return saveCalendar(tx, trip, patch.calendar);
  }
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

export const deleteTrip = async (userId: number, publicId: string) => {
  const trip = await softDeleteTrip(userId, publicId);
  if (!trip) throw notFound("Trip not found");
  return trip;
};

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
