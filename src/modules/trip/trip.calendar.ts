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
  type Slot,
  timeSlotOf,
} from "./trip.schedule.ts";
import type { AvailabilityWindow } from "./trip.types.ts";
import { type CalendarInput, MAX_STOPS } from "./trip.validation.ts";

const stopPlan = (publicId: string, position: number, slot?: Slot) => ({
  publicId,
  position,
  slotDate: slot?.date ?? null,
  slotStart: slot?.startMinute ?? null,
  slotEnd: slot?.endMinute ?? null,
  slotLocked: slot?.locked ?? false,
});

/**
 * Saves trip dates, every time slot, changed open hours, duplicated stops and the list order together.
 * Copies use temporary client IDs until saved. Everything is checked before anything is written.
 */
export const saveCalendar = async (tx: Tx, trip: TripRow, calendar: CalendarInput) => {
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

  const order = (calendar.order ?? trip.stops.map((stop) => stop.publicId)).map(resolve);
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

  const slots = new Map(
    calendar.timeSlots.map((slot) => [
      resolve(slot.stopId),
      { ...slot, stopId: resolve(slot.stopId) },
    ]),
  );
  assertSchedule(calendar.startDate, calendar.endDate, [...slots.values()]);
  for (const slot of slots.values()) {
    const place = placeOf.get(slot.stopId);
    if (!place) throw badRequest("A time slot's stop does not belong to this trip");
    if (!isOpen(hours.get(place.id)?.availability ?? place.availability, slot))
      throw badRequest("A time slot falls outside its open hours. Move or remove it first.");
  }
  for (const stop of trip.stops) assertReservationKept(timeSlotOf(stop), slots.get(stop.publicId));
  assertChronological(order.map((id) => slots.get(id)));

  // Copies are the ordered stops that aren't saved yet.
  await insertStops(
    tx,
    trip.id,
    order.flatMap((publicId, position) => {
      const place = placeOf.get(publicId);
      return place && !saved.has(publicId) ? [{ publicId, placeId: place.id, position }] : [];
    }),
  );
  await saveStopPlans(
    tx,
    trip.id,
    order
      .map((publicId, position) => stopPlan(publicId, position, slots.get(publicId)))
      .filter((plan) => {
        const stop = saved.get(plan.publicId);
        return (
          !stop ||
          !isDeepStrictEqual(plan, stopPlan(stop.publicId, stop.position, timeSlotOf(stop)))
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
