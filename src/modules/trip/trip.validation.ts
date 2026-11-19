import { z } from "zod";
import { coordinatesSchema, mapboxIdSchema, publicIdSchema } from "../../lib/validation.ts";
import { sortWindows, windowsOverlap } from "./trip.schedule.ts";
import { RESERVATIONS, type StopDetails } from "./trip.types.ts";

export const MAX_STOPS = 1000;

const isUnique = (values: unknown[]) => new Set(values).size === values.length;

const nameSchema = z.string().trim().min(1).max(255);

const stopSchema = z.object({
  publicId: publicIdSchema.optional(),
  clientId: publicIdSchema.optional(),
  mapboxId: mapboxIdSchema,
  name: nameSchema,
  streetAddress: z.string().trim().max(500).default(""),
  areaAddress: z.string().trim().max(500).default(""),
  category: z.string().trim().max(255).default(""),
  coordinates: coordinatesSchema,
});

// The full list: array order sets positions. Place fields are only read for new stops.
const stopsSchema = z
  .array(stopSchema)
  .max(MAX_STOPS)
  .refine((stops) => isUnique(stops.flatMap((stop) => stop.publicId ?? [])), "Duplicate stop IDs")
  .refine(
    (stops) => isUnique(stops.flatMap((stop) => stop.clientId ?? [])),
    "Duplicate temporary stop IDs",
  );

const minuteSchema = z.number().int().min(0).max(1440).multipleOf(30);

const windowSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
  })
  .refine(
    (window) => window.endMinute > window.startMinute,
    "Open hours must end after they start",
  );

const visitSchema = z
  .object({
    stopId: publicIdSchema,
    date: z.string().date(),
    startMinute: minuteSchema,
    endMinute: minuteSchema,
    locked: z.boolean().default(false),
  })
  .refine((visit) => visit.endMinute > visit.startMinute, "Visits must end after they start");

/** The calendar sends every visit, changed open hours (per stop) and the full order, copies included. */
const calendarSchema = z.object({
  startDate: z.string().date().nullable(),
  endDate: z.string().date().nullable(),
  visits: z
    .array(visitSchema)
    .max(MAX_STOPS)
    .refine(
      (visits) => isUnique(visits.map((visit) => visit.stopId)),
      "Each stop can have one visit; duplicate it for another",
    ),
  availability: z
    .array(
      z.object({
        publicId: publicIdSchema,
        availability: z
          .array(windowSchema)
          .max(7 * 48)
          .transform(sortWindows)
          .refine((windows) => !windowsOverlap(windows), "Open hours cannot overlap"),
      }),
    )
    .max(MAX_STOPS)
    .refine((items) => isUnique(items.map((item) => item.publicId)), "Duplicate stop IDs"),
  newStops: z
    .array(z.object({ clientId: publicIdSchema, sourceStopId: publicIdSchema }))
    .max(MAX_STOPS)
    .refine(
      (copies) => isUnique(copies.map((copy) => copy.clientId)),
      "Duplicate temporary stop IDs",
    )
    .default([]),
  order: z.array(publicIdSchema).max(MAX_STOPS),
});

export type CalendarInput = z.infer<typeof calendarSchema>;

export const createTripSchema = z.object({
  name: nameSchema.default("Current trip"),
  stops: stopsSchema
    .refine((stops) => stops.every((stop) => !stop.publicId), "New trips cannot have saved stops")
    .default([]),
});

const isWebUrl = (value: string) =>
  !value || ["http:", "https:"].includes(URL.parse(value)?.protocol ?? "");

/** Stops table rows, one per place: `publicId` is the place ID. */
const placeDetailsSchema = z
  .array(
    z.object({
      publicId: publicIdSchema,
      category: z.string().trim().max(255),
      type: z.string().trim().max(255),
      details: z.string().max(10_000),
      notes: z.string().max(20_000),
      url: z.string().trim().max(2048).refine(isWebUrl, "Use an http or https URL"),
      reservations: z.enum(RESERVATIONS).nullable(),
      // numeric(12,2) rounds to cents, so 12.345 saves as 12.35.
      price: z.number().min(0).max(9_999_999_999.99).nullable(),
    }) satisfies z.ZodType<StopDetails & { publicId: string }>,
  )
  .max(MAX_STOPS)
  .refine((places) => isUnique(places.map((place) => place.publicId)), "Duplicate place IDs");

export type PlaceDetailsInput = z.infer<typeof placeDetailsSchema>;

// The drawer saves name and stops; every other key is its own scope.
const DRAWER_KEYS = new Set(["name", "stops"]);
const scopeOf = (key: string) => (DRAWER_KEYS.has(key) ? "drawer" : key);

/** Each page saves on its own, so a patch holds one scope. */
export const tripPatchSchema = z
  .object({
    version: z.number().int().positive().safe(),
    name: nameSchema.optional(),
    stops: stopsSchema.optional(),
    placeDetails: placeDetailsSchema.optional(),
    calendar: calendarSchema.optional(),
  })
  .strict()
  .refine(({ version: _version, ...scopes }) => {
    const keys = Object.entries(scopes).flatMap(([key, value]) => (value === undefined ? [] : key));
    return new Set(keys.map(scopeOf)).size <= 1;
  }, "Save one page at a time");

export type StopInput = z.infer<typeof stopSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type TripPatch = z.infer<typeof tripPatchSchema>;
