import { z } from "zod";

const coordinatesSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

export const searchBodySchema = z.object({
  query: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(255),
  address: z.string().trim().max(500).default(""),
  coordinates: coordinatesSchema,
});

export type SearchBody = z.infer<typeof searchBodySchema>;
