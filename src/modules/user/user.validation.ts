import { z } from "zod";
import { coordinatesSchema } from "../../lib/validation.ts";
import { ColorValues, type UserPreferences } from "../../types";

const preferencesSchema = z.object({
  colorMode: z.enum(ColorValues),
  displayName: z.string().trim().max(255),
  mapStyle: z.string().max(255).optional(),
  performanceMode: z.boolean(),
  lastLocation: coordinatesSchema.optional(),
}) satisfies z.ZodType<UserPreferences>;

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  preferences: preferencesSchema.optional(),
});

export const googleLoginSchema = z.object({
  code: z.string({ required_error: "Missing authorization code" }).min(1),
  codeVerifier: z.string({ required_error: "Missing code verifier" }).min(1),
});
