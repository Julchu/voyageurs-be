import { z } from "zod";
import type { CreateTripInput, TripStopInput, UpdateTripInput } from "./trip.types.ts";

export const publicIdSchema = z.string().uuid();

const coordinatesSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

const tripStopBodySchema = z.object({
  publicId: publicIdSchema.optional(),
  mapboxId: z.string().trim().min(1).max(1024).optional(),
  name: z.string().trim().min(1).max(255),
  streetAddress: z.string().trim().max(500).default(""),
  areaAddress: z.string().trim().max(500).default(""),
  category: z.string().trim().max(255).default(""),
  coordinates: coordinatesSchema,
}) satisfies z.ZodType<TripStopInput>;

// Array order determines positions. Full saves preserve stored visited state.
const stopsSchema = z
  .array(tripStopBodySchema)
  .max(1000)
  .refine(
    (stops) => {
      const ids = stops.flatMap((stop) => {
        const id = stop.publicId;
        return id ? [id] : [];
      });
      return new Set(ids).size === ids.length;
    },
    { message: "Duplicate stop IDs" },
  );

const tripBodySchema = z.object({
  name: z.string().trim().min(1).max(255).default("Current trip"),
  stops: stopsSchema.default([]),
});

export const createTripBodySchema = tripBodySchema.refine(
  (value) => value.stops.every((stop) => !stop.publicId),
  { message: "New trips cannot contain saved stop IDs" },
) satisfies z.ZodType<CreateTripInput>;

export const updateTripBodySchema = tripBodySchema
  .partial()
  .extend({ version: z.number().int().positive().safe() })
  .refine((value) => value.name !== undefined || value.stops !== undefined, {
    message: "Nothing to update",
  }) satisfies z.ZodType<UpdateTripInput>;

export const publicIdFrom = (value: string | undefined) => {
  const parsed = publicIdSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};

export type TripStopBody = z.infer<typeof tripStopBodySchema>;
export type CreateTripBody = z.infer<typeof createTripBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
