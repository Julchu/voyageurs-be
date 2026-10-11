import { z } from "zod";

export const publicIdSchema = z.string().uuid();

const coordinatesSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const createTripBodySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
});

export const updateTripBodySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    status: z.enum(["current", "previous"]).optional(),
  })
  .refine((value) => value.name !== undefined || value.status !== undefined, {
    message: "Nothing to update",
  });

export const stopBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  streetAddress: z.string().trim().max(500).default(""),
  areaAddress: z.string().trim().max(500).default(""),
  coordinates: coordinatesSchema,
});

export const reorderBodySchema = z.object({
  publicIds: z.array(publicIdSchema),
});

export const visitedBodySchema = z.object({
  visited: z.boolean(),
});

export type StopBody = z.infer<typeof stopBodySchema>;
export type UpdateTripBody = z.infer<typeof updateTripBodySchema>;