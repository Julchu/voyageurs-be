import { z } from "zod";
import { coordinatesSchema } from "../../lib/validation.ts";
import type { PlaceSearchInput } from "../../types";

export const searchBodySchema = z.object({
  query: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(255),
  streetAddress: z.string().trim().max(500).default(""),
  areaAddress: z.string().trim().max(500).default(""),
  category: z.string().trim().max(255).default(""),
  coordinates: coordinatesSchema,
}) satisfies z.ZodType<PlaceSearchInput, z.ZodTypeDef, unknown>;
