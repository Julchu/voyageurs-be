import { db } from "../../db";
import type { SelectTripStop } from "../../db/schemas/trip.schema.ts";
import { ConflictError, ValidationError } from "../../lib/errors.ts";
import { toTripDto } from "./trip.mapper.ts";
import {
  findActiveStopsForTrips,
  findActiveTrips,
  findActiveTripStops,
  findOwnedTripForUpdate,
  insertTrip,
  insertTripStops,
  softDeleteTripStops,
  type TripStopValues,
  type TripTransaction,
  updateTripDetails,
  updateTripStops,
} from "./trip.queries.ts";
import type { TripDto } from "./trip.types.ts";
import type { CreateTripBody, TripStopBody, UpdateTripBody } from "./trip.validation.ts";

// Restore a user's saved trips by returning active trips with their ordered stops.
export const listTrips = async (userId: number): Promise<TripDto[]> => {
  const trips = await findActiveTrips(userId);
  if (trips.length === 0) return [];

  const stops = await findActiveStopsForTrips(trips.map((trip) => trip.id));
  const stopsByTrip = new Map<number, SelectTripStop[]>();
  for (const stop of stops) {
    const list = stopsByTrip.get(stop.tripId) ?? [];
    list.push(stop);
    stopsByTrip.set(stop.tripId, list);
  }
  return trips.map((trip) => toTripDto(trip, stopsByTrip.get(trip.id) ?? []));
};

// Keep stop writes consistent by mapping input fields and list order to database values.
const stopValues = (input: TripStopBody, position: number): TripStopValues => ({
  mapboxId: input.mapboxId ?? null,
  name: input.name,
  streetAddress: input.streetAddress,
  areaAddress: input.areaAddress,
  category: input.category,
  latitude: input.coordinates.lat,
  longitude: input.coordinates.lng,
  position,
});

// Preserve stop identities and visit history when syncing a full list; the caller must hold the trip lock.
const syncTripStops = async (tx: TripTransaction, tripId: number, inputs: TripStopBody[]) => {
  const existing = await findActiveTripStops(tx, tripId);
  const known = new Map(existing.map((stop) => [stop.publicId, stop]));
  const retained = new Set<string>();
  const added: TripStopValues[] = [];
  const changed: (TripStopValues & { publicId: string })[] = [];

  for (const [position, input] of inputs.entries()) {
    const values = stopValues(input, position);
    if (!input.publicId) {
      added.push(values);
      continue;
    }
    const stored = known.get(input.publicId);
    if (!stored) throw new ValidationError("A stop does not belong to this trip");
    retained.add(input.publicId);
    if (
      (Object.keys(values) as (keyof TripStopValues)[]).some((key) => values[key] !== stored[key])
    ) {
      changed.push({ ...values, publicId: input.publicId });
    }
  }

  const removed = existing
    .filter((stop) => !retained.has(stop.publicId))
    .map((stop) => stop.publicId);
  if (!added.length && !changed.length && !removed.length)
    return { stops: existing, changed: false };

  await insertTripStops(tx, tripId, added);
  await updateTripStops(tx, tripId, changed);
  await softDeleteTripStops(tx, tripId, removed);
  return { stops: await findActiveTripStops(tx, tripId), changed: true };
};

// Save a new itinerary together by creating its trip and stops in one transaction.
export const createTrip = (userId: number, input: CreateTripBody): Promise<TripDto> =>
  db.transaction(async (tx) => {
    const created = await insertTrip(tx, userId, input.name);
    if (!created) throw new Error("Trip was not created");
    const stops = await insertTripStops(tx, created.id, input.stops.map(stopValues));
    return toTripDto(created, stops);
  });

// Prevent stale saves from overwriting newer edits by checking the version before updating a locked trip.
export const updateTrip = (
  userId: number,
  publicId: string,
  patch: UpdateTripBody,
): Promise<TripDto | undefined> =>
  db.transaction(async (tx) => {
    const owned = await findOwnedTripForUpdate(tx, userId, publicId);
    if (!owned) return;
    if (patch.version !== owned.version) {
      throw new ConflictError(
        "This trip changed elsewhere. Reload and restore the latest saved trip before editing.",
      );
    }

    const result =
      patch.stops === undefined
        ? { stops: await findActiveTripStops(tx, owned.id), changed: false }
        : await syncTripStops(tx, owned.id, patch.stops);
    const name = patch.name ?? owned.name;
    if (name === owned.name && !result.changed) return toTripDto(owned, result.stops);

    const updated = await updateTripDetails(tx, owned.id, name);
    if (!updated) throw new Error("Trip was not updated");
    return toTripDto(updated, result.stops);
  });
