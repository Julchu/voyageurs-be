import { z } from "zod";

// .env files write unset vars as "", so blank means unset.
const defined = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value));

export const env = z
  .object({
    NODE_ENV: z.enum(["development", "staging", "production"]),
    PORT: z.coerce.number().int().positive().default(8001),
    DATABASE_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    ACCESS_TOKEN_KEY: z.string(),
    REFRESH_TOKEN_KEY: z.string(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URIS: z.string().url(),
    TRIPADVISOR_API_KEY: z.string(),
    IPINFO_GEOLOCATION_API_KEY: z.string().optional(),
    // Hop count, or "true" to trust every proxy.
    TRUST_PROXY: z
      .string()
      .regex(/^(true|\d+)$/, 'Use "true" or a hop count')
      .optional(),
    MASTER_KEY: z.string().optional(),
    MASTER_TEST_EMAIL: z.string().optional(),
  })
  .parse(defined);
