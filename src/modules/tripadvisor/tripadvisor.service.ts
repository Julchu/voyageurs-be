import { namesMatch, normalizePlaceName } from "../../utils/place-name.ts";

/**
 * Tripadvisor Terra API (https://docs.terra.tripadvisor.com).
 * Billing: nearby bills one entity per location returned, photos and details one per call.
 * Caching policy: only the location id may be stored; photos and URLs are fetched live, never re-hosted.
 */
const BASE_URL = "https://terra.tripadvisor.com/api";
const TIMEOUT_MS = 5000;
/** Max distance (km) a nearby candidate may be from the clicked POI. */
const NEARBY_RADIUS_KM = 0.2;
/** Each returned location is billed; keep this small. */
const NEARBY_SIZE = 5;
const PHOTO_SIZE = 5;
/** Location ids kept per server instance; the oldest is dropped first. */
const MAX_CACHED_IDS = 5000;

type TerraLocation = {
  id: number;
  names?: { value: string }[];
  urls?: { tripadvisor?: { main?: string } };
};
type TerraNearbyItem = { location: TerraLocation };
type TerraPhotoItem = {
  photo?: { original_size_url?: string; original_width?: number; original_height?: number };
  user?: { username?: string };
};

export type PlaceLookup = { name: string; lat: number; lng: number; mapboxId?: string };
export type TripadvisorPhoto = {
  url: string;
  width: number | null;
  height: number | null;
  author?: string;
};
export type TripadvisorPhotos = { photos: TripadvisorPhoto[]; tripadvisorUrl?: string };
type LocationMatch = { id: number; webUrl?: string };

const cachedIds = new Map<string, number | null>();
const pendingLookups = new Map<string, Promise<LocationMatch | null>>();

const terraGet = async <T>(path: string, params: Record<string, string | number> = {}) => {
  const key = process.env.TRIPADVISOR_API_KEY;
  if (!key) throw new Error("Missing TRIPADVISOR_API_KEY");

  const url = new URL(`${BASE_URL}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));

  const response = await fetch(url, {
    headers: { "X-API-Key": key, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Tripadvisor ${path} failed with ${response.status}`);
  return (await response.json()) as T;
};

const locationWebUrl = (location: TerraLocation) => location.urls?.tripadvisor?.main;

const hasName = (location: TerraLocation, name: string) =>
  (location.names ?? []).some(({ value }) => namesMatch(name, value));

/** Matches by name within a small radius, never by distance alone, so a neighbour's photos can't leak in. */
const findLocation = async ({ name, lat, lng }: PlaceLookup): Promise<LocationMatch | null> => {
  if (!normalizePlaceName(name)) return null;

  const { data } = await terraGet<{ data?: TerraNearbyItem[] }>("/locations/nearby", {
    lat,
    lon: lng,
    radius: NEARBY_RADIUS_KM,
    unit: "KM",
    sort: "distance,asc",
    size: NEARBY_SIZE,
  });
  // Sorted by distance, so the first name match is the closest.
  const match = data?.find(({ location }) => hasName(location, name));
  return match ? { id: match.location.id, webUrl: locationWebUrl(match.location) } : null;
};

const cacheKey = ({ name, lat, lng, mapboxId }: PlaceLookup) =>
  mapboxId ?? `${normalizePlaceName(name)}:${lat.toFixed(4)}:${lng.toFixed(4)}`;

const rememberId = (key: string, id: number | null) => {
  if (cachedIds.size >= MAX_CACHED_IDS) {
    const oldest = cachedIds.keys().next().value;
    if (oldest !== undefined) cachedIds.delete(oldest);
  }
  cachedIds.set(key, id);
};

/** One billed search per POI at a time, even when the same card opens twice. */
const findLocationOnce = (key: string, place: PlaceLookup) => {
  const pending = pendingLookups.get(key);
  if (pending) return pending;

  const lookup = findLocation(place)
    .then((match) => {
      rememberId(key, match?.id ?? null);
      return match;
    })
    .finally(() => pendingLookups.delete(key));
  pendingLookups.set(key, lookup);
  return lookup;
};

/** The cached location id when known, otherwise a billed search. */
const resolveLocation = async (place: PlaceLookup): Promise<LocationMatch | null> => {
  const key = cacheKey(place);
  const id = cachedIds.get(key);
  if (id === undefined) return findLocationOnce(key, place);
  return id === null ? null : { id };
};

const fetchLocationWebUrl = async (id: number) =>
  locationWebUrl(await terraGet<TerraLocation>(`/locations/${id}`));

/** Skips photos without an https URL. */
const toPhoto = ({ photo, user }: TerraPhotoItem): TripadvisorPhoto | undefined => {
  const url = photo?.original_size_url;
  if (!url?.startsWith("https://")) return;
  return {
    url,
    width: photo?.original_width ?? null,
    height: photo?.original_height ?? null,
    author: user?.username,
  };
};

const fetchLocationPhotos = async (id: number) => {
  const { data } = await terraGet<{ data?: TerraPhotoItem[] }>(`/locations/${id}/photos`, {
    page: 1,
    size: PHOTO_SIZE,
  });
  return (data ?? []).map(toPhoto).filter((photo) => photo !== undefined);
};

/** Photos plus the link-back Tripadvisor requires wherever they are shown. */
export const getTripadvisorPhotos = async (place: PlaceLookup): Promise<TripadvisorPhotos> => {
  const location = await resolveLocation(place);
  if (!location) return { photos: [] };

  const [photos, tripadvisorUrl] = await Promise.all([
    fetchLocationPhotos(location.id),
    location.webUrl ?? fetchLocationWebUrl(location.id),
  ]);
  return { photos, tripadvisorUrl };
};
