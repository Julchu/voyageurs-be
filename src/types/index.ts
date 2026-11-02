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

export type PlaceSearch = {
  publicId: string;
  createdAt: string | null;
  updatedAt: string | null;
  query: string;
  name: string;
  streetAddress: string;
  areaAddress: string;
  category: string;
  coordinates: Coordinates;
  searchedAt: string;
};

export type PlaceSearchInput = {
  query: string;
  name: string;
  streetAddress: string;
  areaAddress: string;
  category: string;
  coordinates: Coordinates;
};

export interface User {
  publicId: string;
  createdAt: string | null;
  updatedAt: string | null;
  email: string;
  image?: string | null;
  name: string;
  preferences?: UserPreferences;
  lastLocation?: Coordinates;
}

export type AuthRequest<
  TParams = Record<string, unknown>,
  TResBody = unknown,
  TReqBody = unknown,
  TQuery = Record<string, unknown>,
> = Request<TParams, TResBody, TReqBody, TQuery> & {
  userId?: number;
};
