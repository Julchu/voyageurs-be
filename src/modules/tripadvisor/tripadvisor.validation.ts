import { z } from "zod";
import type { PlaceLookup } from "./tripadvisor.service.ts";

// Query strings, so numbers arrive as text.
export const photosQuerySchema = z.object({
  name: z.string().trim().min(1).max(200),
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
}) satisfies z.ZodType<PlaceLookup, z.ZodTypeDef, unknown>;
