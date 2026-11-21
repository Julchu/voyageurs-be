import type { SelectTripStop } from "../../db/schemas/trip.schema.ts";
import { badRequest } from "../../lib/errors.ts";
import type { AvailabilityWindow, TimeSlot } from "./trip.types.ts";

// Calendar rules. The frontend plans moves; the backend only checks the result.

export const STEP_MINUTES = 30;
export const MAX_TRIP_DAYS = 366;

export type Slot = Omit<TimeSlot, "id">;

// Dates are destination-local days, so UTC is only a neutral clock here.
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

const compareSlots = (left: Slot, right: Slot) =>
  left.date.localeCompare(right.date) || left.startMinute - right.startMinute;

const sameTime = (left: Slot, right: Slot) =>
  left.date === right.date &&
  left.startMinute === right.startMinute &&
  left.endMinute === right.endMinute;

/** True when an item and the one before it break the rule. */
const someConsecutive = <T>(sorted: T[], broken: (previous: T, item: T) => boolean) =>
  sorted.some((item, index) => index > 0 && broken(sorted[index - 1]!, item));

export const timeSlotOf = (stop: SelectTripStop): Slot | undefined =>
  stop.slotDate && stop.slotStart !== null && stop.slotEnd !== null
    ? {
        stopId: stop.publicId,
        date: stop.slotDate,
        startMinute: stop.slotStart,
        endMinute: stop.slotEnd,
        locked: stop.slotLocked,
      }
    : undefined;

export const sortWindows = (windows: AvailabilityWindow[]) =>
  windows.toSorted((left, right) => left.day - right.day || left.startMinute - right.startMinute);

export const windowsOverlap = (sorted: AvailabilityWindow[]) =>
  someConsecutive(
    sorted,
    (previous, window) => previous.day === window.day && previous.endMinute > window.startMinute,
  );

/** Every half hour of the slot is inside open hours; touching windows count as one. */
export const isOpen = (windows: AvailabilityWindow[], { date, startMinute, endMinute }: Slot) => {
  if (!windows.length) return true;
  const day = weekday(date);
  for (let minute = startMinute; minute < endMinute; minute += STEP_MINUTES) {
    const stepEnd = minute + STEP_MINUTES;
    if (!windows.some((w) => w.day === day && w.startMinute <= minute && stepEnd <= w.endMinute))
      return false;
  }
  return true;
};

/** Both trip dates or neither, up to 366 days, with every time slot inside and none overlapping. */
export const assertSchedule = (startDate: string | null, endDate: string | null, slots: Slot[]) => {
  if (!startDate || !endDate) {
    if (startDate || endDate) throw badRequest("Choose both trip dates, or neither");
    if (slots.length) throw badRequest("Choose trip dates before adding time slots");
    return;
  }

  const days = dayNumber(endDate) - dayNumber(startDate) + 1;
  if (days < 1 || days > MAX_TRIP_DAYS)
    throw badRequest(`Choose a trip of up to ${MAX_TRIP_DAYS} days`);
  if (slots.some(({ date }) => date < startDate || date > endDate))
    throw badRequest("Time slots must fall within the trip dates");

  const overlap = someConsecutive(
    slots.toSorted(compareSlots),
    (previous, slot) => previous.date === slot.date && previous.endMinute > slot.startMinute,
  );
  if (overlap) throw badRequest("Time slots cannot overlap");
};

/** Scheduled stops appear in the list in time order; unscheduled ones can sit anywhere. */
export const assertChronological = (slotsInListOrder: (Slot | undefined)[]) => {
  const timed = slotsInListOrder.filter((slot) => slot !== undefined);
  if (someConsecutive(timed, (previous, slot) => compareSlots(previous, slot) > 0))
    throw badRequest("Scheduled stops must stay in time order");
};

/** A reserved time slot keeps its time until it's unreserved. Removing it is fine. */
export const assertReservationKept = (before?: Slot, after?: Slot) => {
  if (before?.locked && after?.locked && !sameTime(before, after))
    throw badRequest("Remove the reservation before changing this time slot");
};
