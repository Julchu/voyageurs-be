import { z } from "zod";

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
});

// Array order determines positions. Full saves preserve stored visited state.
const stopsSchema = z.array(tripStopBodySchema).max(1000).refine((stops) => {
  const ids = stops.flatMap((stop) => {
    const id = stop.publicId;
    return id ? [id] : [];
  });
  return new Set(ids).size === ids.length;
}, { message: "Duplicate stop IDs" });

export const createTripBodySchema = z.object({
  name: z.string().trim().min(1).max(255).default("Current trip"),
  stops: stopsSchema.default([]),
});

export const updateTripBodySchema = createTripBodySchema
  .partial()
  .refine((value) => value.name !== undefined || value.stops !== undefined, {
    message: "Nothing to update",
  });

export type TripStopBody = z.infer<typeof tripStopBodySchema>;
export type CreateTripBody = z.infer<typeof createTripBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;
