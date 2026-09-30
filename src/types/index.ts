import type { Request } from "express";

export const Color = {
  LIGHT: "light",
  DARK: "dark",
} as const;

export const ColorValues = [Color.LIGHT, Color.DARK] as const;
export type ColorMode = (typeof ColorValues)[number];

export type Coordinates = {
  lat: number;
  lng: number;
};

export type UserPreferences = {
  colorMode: ColorMode;
  displayName: string;
  mapStyle?: string;
  performanceMode: boolean;
  lastLocation?: Coordinates;
};

export const TripStatusValues = ["current", "previous"] as const;
export type TripStatus = (typeof TripStatusValues)[number];

export type TripStop = {
  publicId: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  position: number;
  visited: boolean;
  visitedAt: string | null;
};

export type Trip = {
  publicId: string;
  name: string;
  status: TripStatus;
  stops: TripStop[];
};

export type PlaceSearch = {
  publicId: string;
  query: string;
  name: string;
  address: string;
  coordinates: Coordinates;
  searchedAt: string;
};

export type StopInput = {
  name: string;
  address: string;
  coordinates: Coordinates;
};

export type PlaceSearchInput = {
  query: string;
  name: string;
  address: string;
  coordinates: Coordinates;
};

export interface User {
  id: number;
  publicId: string;
  email: string;
  image?: string | null;
  name: string;
  preferences?: UserPreferences;
}

export type AuthRequest<
  TParams = Record<string, unknown>,
  TResBody = unknown,
  TReqBody = unknown,
  TQuery = Record<string, unknown>,
> = Request<TParams, TResBody, TReqBody, TQuery> & {
  userId?: number;
};
