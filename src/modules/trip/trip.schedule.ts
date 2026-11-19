import type { SelectTripStop } from "../../db/schemas/trip.schema.ts";
import { badRequest } from "../../lib/errors.ts";
import type { AvailabilityWindow, ScheduledVisit } from "./trip.types.ts";

// Calendar rules. The frontend plans moves; the backend only checks the result.

export const SLOT_MINUTES = 30;
export const MAX_TRIP_DAYS = 366;

export type Visit = Omit<ScheduledVisit, "id">;

// Dates are destination-local days, so UTC is only a neutral clock here.
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;
const weekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

const compareVisits = (left: Visit, right: Visit) =>
  left.date.localeCompare(right.date) || left.startMinute - right.startMinute;

const sameTime = (left: Visit, right: Visit) =>
  left.date === right.date &&
  left.startMinute === right.startMinute &&
  left.endMinute === right.endMinute;

/** True when an item and the one before it break the rule. */
const someConsecutive = <T>(sorted: T[], broken: (previous: T, item: T) => boolean) =>
  sorted.some((item, index) => index > 0 && broken(sorted[index - 1]!, item));

export const visitOf = (stop: SelectTripStop): Visit | undefined =>
  stop.visitDate && stop.visitStart !== null && stop.visitEnd !== null
    ? {
        stopId: stop.publicId,
        date: stop.visitDate,
        startMinute: stop.visitStart,
        endMinute: stop.visitEnd,
        locked: stop.visitLocked,
      }
    : undefined;

export const sortWindows = (windows: AvailabilityWindow[]) =>
  windows.toSorted((left, right) => left.day - right.day || left.startMinute - right.startMinute);

export const windowsOverlap = (sorted: AvailabilityWindow[]) =>
  someConsecutive(
    sorted,
    (previous, window) => previous.day === window.day && previous.endMinute > window.startMinute,
  );

/** Every half hour of the visit is inside open hours; touching windows count as one. */
export const isOpen = (windows: AvailabilityWindow[], { date, startMinute, endMinute }: Visit) => {
  if (!windows.length) return true;
  const day = weekday(date);
  for (let minute = startMinute; minute < endMinute; minute += SLOT_MINUTES) {
    const slotEnd = minute + SLOT_MINUTES;
    if (!windows.some((w) => w.day === day && w.startMinute <= minute && slotEnd <= w.endMinute))
      return false;
  }
  return true;
};

/** Both trip dates or neither, up to 366 days, with every visit inside and none overlapping. */
export const assertSchedule = (
  startDate: string | null,
  endDate: string | null,
  visits: Visit[],
) => {
  if (!startDate || !endDate) {
    if (startDate || endDate) throw badRequest("Choose both trip dates, or neither");
    if (visits.length) throw badRequest("Choose trip dates before scheduling visits");
    return;
  }

  const days = dayNumber(endDate) - dayNumber(startDate) + 1;
  if (days < 1 || days > MAX_TRIP_DAYS)
    throw badRequest(`Choose a trip of up to ${MAX_TRIP_DAYS} days`);
  if (visits.some(({ date }) => date < startDate || date > endDate))
    throw badRequest("Visits must fall within the trip dates");

  const overlap = someConsecutive(
    visits.toSorted(compareVisits),
    (previous, visit) => previous.date === visit.date && previous.endMinute > visit.startMinute,
  );
  if (overlap) throw badRequest("Visits cannot overlap");
};

/** Scheduled stops appear in the list in time order; unscheduled ones can sit anywhere. */
export const assertChronological = (visitsInListOrder: (Visit | undefined)[]) => {
  const timed = visitsInListOrder.filter((visit) => visit !== undefined);
  if (someConsecutive(timed, (previous, visit) => compareVisits(previous, visit) > 0))
    throw badRequest("Scheduled stops must stay in time order");
};

/** A reserved visit keeps its time until it's unreserved. Removing it is fine. */
export const assertReservationKept = (before?: Visit, after?: Visit) => {
  if (before?.locked && after?.locked && !sameTime(before, after))
    throw badRequest("Remove the reservation before changing this visit's time");
};
