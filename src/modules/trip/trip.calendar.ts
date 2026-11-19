import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { SelectTripPlace } from "../../db/schemas/trip.schema.ts";
import { badRequest } from "../../lib/errors.ts";
import {
  insertStops,
  savePlaceHours,
  saveStopPlans,
  type TripRow,
  type Tx,
} from "./trip.queries.ts";
import {
  assertChronological,
  assertReservationKept,
  assertSchedule,
  isOpen,
  type Visit,
  visitOf,
} from "./trip.schedule.ts";
import type { SaveResult } from "./trip.service.ts";
import type { AvailabilityWindow } from "./trip.types.ts";
import { type CalendarInput, MAX_STOPS } from "./trip.validation.ts";

const stopPlan = (publicId: string, position: number, visit?: Visit) => ({
  publicId,
  position,
  visitDate: visit?.date ?? null,
  visitStart: visit?.startMinute ?? null,
  visitEnd: visit?.endMinute ?? null,
  visitLocked: visit?.locked ?? false,
});

/**
 * Saves trip dates, every visit, changed open hours, duplicated stops and the list order together.
 * Copies use temporary client IDs until saved. Everything is checked before anything is written.
 */
export const saveCalendar = async (
  tx: Tx,
  trip: TripRow,
  calendar: CalendarInput,
): Promise<SaveResult> => {
  const saved = new Map(trip.stops.map((stop) => [stop.publicId, stop]));
  const placeOf = new Map(trip.stops.map((stop) => [stop.publicId, stop.place]));

  // A copy is a new stop at its source's place.
  const stopIdMap: Record<string, string> = {};
  for (const { clientId, sourceStopId } of calendar.newStops) {
    const place = placeOf.get(sourceStopId);
    if (!place || saved.has(clientId))
      throw badRequest("A copied stop does not belong to this trip");
    const publicId = randomUUID();
    stopIdMap[clientId] = publicId;
    placeOf.set(publicId, place);
  }
  if (placeOf.size > MAX_STOPS) throw badRequest(`A trip can have at most ${MAX_STOPS} stops`);
  const resolve = (id: string) => stopIdMap[id] ?? id;

  const order = calendar.order.map(resolve);
  if (order.length !== placeOf.size || new Set(order).size !== placeOf.size)
    throw badRequest("The order must list each trip stop once");
  if (!order.every((id) => placeOf.has(id)))
    throw badRequest("A stop does not belong to this trip");

  // Open hours belong to the place, so every stop there shares them.
  const hours = new Map<number, { place: SelectTripPlace; availability: AvailabilityWindow[] }>();
  for (const { publicId, availability } of calendar.availability) {
    const place = placeOf.get(resolve(publicId));
    if (!place) throw badRequest("A stop does not belong to this trip");
    const other = hours.get(place.id);
    if (other && !isDeepStrictEqual(other.availability, availability))
      throw badRequest("Stops at the same place share open hours");
    hours.set(place.id, { place, availability });
  }

  const visits = new Map(
    calendar.visits.map((visit) => [
      resolve(visit.stopId),
      { ...visit, stopId: resolve(visit.stopId) },
    ]),
  );
  for (const visit of visits.values()) {
    const place = placeOf.get(visit.stopId);
    if (!place) throw badRequest("A visit's stop does not belong to this trip");
    if (!isOpen(hours.get(place.id)?.availability ?? place.availability, visit))
      throw badRequest("A visit falls outside its open hours. Move or remove it first.");
  }
  for (const stop of trip.stops) assertReservationKept(visitOf(stop), visits.get(stop.publicId));
  assertSchedule(calendar.startDate, calendar.endDate, [...visits.values()]);
  assertChronological(order.map((id) => visits.get(id)));

  await insertStops(
    tx,
    trip.id,
    calendar.newStops.map(({ clientId }) => {
      const publicId = resolve(clientId);
      return { publicId, placeId: placeOf.get(publicId)!.id, position: order.indexOf(publicId) };
    }),
  );
  await saveStopPlans(
    tx,
    trip.id,
    order
      .map((publicId, position) => stopPlan(publicId, position, visits.get(publicId)))
      .filter((plan) => {
        const stop = saved.get(plan.publicId);
        return (
          !stop || !isDeepStrictEqual(plan, stopPlan(stop.publicId, stop.position, visitOf(stop)))
        );
      }),
  );
  await savePlaceHours(
    tx,
    trip.id,
    [...hours.values()]
      .filter(({ place, availability }) => !isDeepStrictEqual(place.availability, availability))
      .map(({ place, availability }) => ({ id: place.id, availability })),
  );

  return { trip: { startDate: calendar.startDate, endDate: calendar.endDate }, stopIdMap };
};
