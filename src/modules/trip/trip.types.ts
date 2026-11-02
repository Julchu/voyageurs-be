// Public API contract. Keep database and frontend-only fields out of these types.
export type TripStopInput = {
  publicId?: string;
  mapboxId?: string;
  name: string;
  streetAddress?: string;
  areaAddress?: string;
  category?: string;
  coordinates: { lat: number; lng: number };
};

export type CreateTripInput = {
  name?: string;
  stops?: TripStopInput[];
};

export type UpdateTripInput = CreateTripInput & {
  version: number;
};

export type TripStopDto = {
  publicId: string;
  createdAt: string | null;
  updatedAt: string | null;
  mapboxId?: string;
  name: string;
  streetAddress: string;
  areaAddress: string;
  category: string;
  coordinates: { lat: number; lng: number };
  position: number;
  visited: boolean;
  visitedAt: string | null;
};

export type TripDto = {
  publicId: string;
  createdAt: string | null;
  updatedAt: string | null;
  version: number;
  name: string;
  stops: TripStopDto[];
};
