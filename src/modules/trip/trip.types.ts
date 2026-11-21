import type { Coordinates } from "../../types";

// Public API contract. Keep database-only fields out.

export const RESERVATIONS = ["booked", "needs_reservation"] as const;

/** What the stops table edits. Saved on the place, so every stop there shares them. */
export type StopDetails = {
  category: string;
  type: string;
  details: string;
  notes: string;
  url: string;
  reservations: (typeof RESERVATIONS)[number] | null;
  price: number | null;
};

/** Weekly open hours in destination-local minutes; Sunday is 0. Empty means open anytime. */
export type AvailabilityWindow = {
  day: number;
  startMinute: number;
  endMinute: number;
};

/** A stop's single time slot, within one day. `id` is the stop ID; `locked` shows as "Reserved". */
export type TimeSlot = {
  id: string;
  stopId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  locked: boolean;
};

type Timestamps = { createdAt: string; updatedAt: string };

type PlaceFields = {
  mapboxId?: string;
  name: string;
  streetAddress: string;
  areaAddress: string;
  category: string;
  coordinates: Coordinates;
  availability: AvailabilityWindow[];
};

/** A destination, once per trip; its stops share its details. `key` is the Mapbox ID or "lat,lng". */
export type TripPlaceDto = PlaceFields &
  StopDetails &
  Timestamps & {
    publicId: string;
    key: string;
  };

/** One row in the trip list, with its place's fields copied in. */
export type TripStopDto = PlaceFields &
  Timestamps & {
    publicId: string;
    placeId: string;
    position: number;
    visited: boolean;
    visitedAt: string | null;
  };

export type TripDto = Timestamps & {
  publicId: string;
  version: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  /** Time slots in time order, one per scheduled stop. */
  timeSlots: TimeSlot[];
  /** Places with at least one stop, in trip order. */
  places: TripPlaceDto[];
  stops: TripStopDto[];
  /** Saved IDs for the client IDs of stops this request created. */
  stopIdMap?: Record<string, string>;
};
