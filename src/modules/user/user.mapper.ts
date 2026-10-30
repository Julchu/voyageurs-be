import type { SelectUser } from "../../db/schemas/user.schema.ts";
import type { User } from "../../types";

export const toUserDto = (user: SelectUser): User => ({
  publicId: user.publicId,
  name: user.name,
  email: user.email,
  image: user.image,
  preferences: user.preferences,
  lastLocation: user.preferences.lastLocation,
});
