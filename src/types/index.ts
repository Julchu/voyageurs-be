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

export type PlaceSearchInput = {
  query: string;
  mapboxId?: string;
  name: string;
  streetAddress: string;
  areaAddress: string;
  category: string;
  coordinates: Coordinates;
};

export type PlaceSearch = PlaceSearchInput & {
  publicId: string;
  createdAt: string;
  updatedAt: string;
  searchedAt: string;
};

export type User = {
  publicId: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  image?: string | null;
  name: string;
  preferences?: UserPreferences;
  lastLocation?: Coordinates;
};
