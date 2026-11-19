import type { SelectTripPlace } from "../../db/schemas/trip.schema.ts";
import type { StopRow, TripRow } from "./trip.queries.ts";
import type { TripDto, TripPlaceDto, TripStopDto } from "./trip.types.ts";

const placeFields = (place: SelectTripPlace) => ({
  mapboxId: place.mapboxId ?? undefined,
  name: place.name,
  streetAddress: place.streetAddress,
  areaAddress: place.areaAddress,
  category: place.category,
  coordinates: { lat: place.latitude, lng: place.longitude },
});

const toPlaceDto = (place: SelectTripPlace): TripPlaceDto => ({
  ...placeFields(place),
  publicId: place.publicId,
  key: place.placeKey,
  type: place.type,
  details: place.details,
  notes: place.notes,
  url: place.url,
  reservations: place.reservations,
  price: place.price,
  createdAt: place.createdAt.toISOString(),
  updatedAt: place.updatedAt.toISOString(),
});

const toStopDto = ({ place, ...stop }: StopRow): TripStopDto => ({
  ...placeFields(place),
  publicId: stop.publicId,
  placeId: place.publicId,
  createdAt: stop.createdAt.toISOString(),
  updatedAt: stop.updatedAt.toISOString(),
  position: stop.position,
  visited: stop.visited,
  visitedAt: stop.visitedAt?.toISOString() ?? null,
});

export const toTripDto = (trip: TripRow): TripDto => ({
  publicId: trip.publicId,
  createdAt: trip.createdAt.toISOString(),
  updatedAt: trip.updatedAt.toISOString(),
  version: trip.version,
  name: trip.name,
  // A Map keeps each place at its first stop.
  places: [...new Map(trip.stops.map(({ place }) => [place.id, place])).values()].map(toPlaceDto),
  stops: trip.stops.map(toStopDto),
});
