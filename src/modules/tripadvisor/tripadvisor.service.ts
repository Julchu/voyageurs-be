import { z } from "zod";
import { env } from "../../env.ts";
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

// Terra responses are parsed, not trusted: a location id goes into later request paths.
const locationSchema = z.object({
  id: z.number().int(),
  names: z.array(z.object({ value: z.string() })).nullish(),
  urls: z.object({ tripadvisor: z.object({ main: z.string().nullish() }).nullish() }).nullish(),
});
const nearbySchema = z.object({ data: z.array(z.object({ location: locationSchema })).nullish() });
const photoItemSchema = z.object({
  photo: z
    .object({
      original_size_url: z.string().nullish(),
      original_width: z.number().nullish(),
      original_height: z.number().nullish(),
    })
    .nullish(),
  user: z.object({ username: z.string().nullish() }).nullish(),
});
const photosSchema = z.object({ data: z.array(photoItemSchema).nullish() });

type TerraLocation = z.infer<typeof locationSchema>;

export type PlaceLookup = { name: string; lat: number; lng: number };
type TripadvisorPhoto = {
  url: string;
  width: number | null;
  height: number | null;
  author?: string;
};
type TripadvisorPhotos = { photos: TripadvisorPhoto[]; tripadvisorUrl?: string };
type LocationMatch = { id: number; webUrl?: string };

const cachedIds = new Map<string, number | null>();
const pendingLookups = new Map<string, Promise<LocationMatch | null>>();

const terraGet = async <T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  params: Record<string, string | number> = {},
): Promise<z.output<T>> => {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));

  const response = await fetch(url, {
    headers: { "X-API-Key": env.TRIPADVISOR_API_KEY, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Tripadvisor ${path} failed with ${response.status}`);
  return schema.parse(await response.json());
};

const locationWebUrl = (location: TerraLocation) => location.urls?.tripadvisor?.main ?? undefined;

const hasName = (location: TerraLocation, name: string) =>
  (location.names ?? []).some(({ value }) => namesMatch(name, value));

/** Matches by name within a small radius, never by distance alone, so a neighbour's photos can't leak in. */
const findLocation = async ({ name, lat, lng }: PlaceLookup): Promise<LocationMatch | null> => {
  if (!normalizePlaceName(name)) return null;

  const { data } = await terraGet(nearbySchema, "/locations/nearby", {
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

// Keyed on everything the lookup reads, so one client can't pin wrong photos on a place for everyone.
const cacheKey = ({ name, lat, lng }: PlaceLookup) =>
  [normalizePlaceName(name), lat.toFixed(4), lng.toFixed(4)].join("|");

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
  locationWebUrl(await terraGet(locationSchema, `/locations/${id}`));

/** Skips photos without an https URL. */
const toPhoto = ({
  photo,
  user,
}: z.infer<typeof photoItemSchema>): TripadvisorPhoto | undefined => {
  const url = photo?.original_size_url;
  if (!url?.startsWith("https://")) return;
  return {
    url,
    width: photo?.original_width ?? null,
    height: photo?.original_height ?? null,
    author: user?.username ?? undefined,
  };
};

const fetchLocationPhotos = async (id: number) => {
  const { data } = await terraGet(photosSchema, `/locations/${id}/photos`, {
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
