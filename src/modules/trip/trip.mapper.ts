import type { SelectTrip, SelectTripStop } from "../../db/schemas/trip.schema.ts";
import type { TripDto, TripStopDto } from "./trip.types.ts";

const toStopDto = (stop: SelectTripStop): TripStopDto => ({
  publicId: stop.publicId,
  createdAt: stop.createdAt?.toISOString() ?? null,
  updatedAt: stop.updatedAt?.toISOString() ?? null,
  // Map click creates local stop with no Mapbox id
  // Separate lookup might not find a Mapbox id
  // If no Mapbox id, fallback to address
  ...(stop.mapboxId ? { mapboxId: stop.mapboxId } : {}),
  name: stop.name,
  streetAddress: stop.streetAddress,
  areaAddress: stop.areaAddress,
  category: stop.category,
  coordinates: { lat: stop.latitude, lng: stop.longitude },
  position: stop.position,
  visited: stop.visited,
  visitedAt: stop.visitedAt?.toISOString() ?? null,
});

export const toTripDto = (trip: SelectTrip, stops: SelectTripStop[]): TripDto => ({
  publicId: trip.publicId,
  createdAt: trip.createdAt?.toISOString() ?? null,
  updatedAt: trip.updatedAt?.toISOString() ?? null,
  version: trip.version,
  name: trip.name,
  stops: stops
    .filter((stop) => stop.deletedAt === null)
    .sort((left, right) => left.position - right.position)
    .map(toStopDto),
});