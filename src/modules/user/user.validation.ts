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

/** The web sends a PKCE code from its redirect; the iOS app signs in on the device and sends Google's ID token. */
export const googleLoginSchema = z.union(
  [
    z.object({
      code: z.string().min(1),
      codeVerifier: z.string().min(1),
    }),
    z.object({ idToken: z.string().min(1) }),
  ],
  { errorMap: () => ({ message: "Missing authorization code or ID token" }) },
);

export type GoogleLogin = z.infer<typeof googleLoginSchema>;
