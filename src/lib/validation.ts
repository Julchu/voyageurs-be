import { z } from "zod";
import { badRequest } from "./errors.ts";

export const publicIdSchema = z.string().uuid();

export const coordinatesSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

// Blank means no Mapbox ID, like the frontend's placeKey.
export const mapboxIdSchema = z
  .string()
  .trim()
  .max(1024)
  .optional()
  .transform((id) => id || undefined);

export const isPublicId = (value: unknown): value is string =>
  publicIdSchema.safeParse(value).success;

/** Parses request input, failing with its first issue as a 400. */
export const parse = <T extends z.ZodTypeAny>(schema: T, value: unknown): z.output<T> => {
  const result = schema.safeParse(value);
  if (!result.success) throw badRequest(result.error.issues[0]?.message ?? "Invalid request");
  return result.data;
};
