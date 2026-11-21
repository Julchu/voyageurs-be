import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { jsonb, pgTable, varchar } from "drizzle-orm/pg-core";
import { Color, type UserPreferences } from "../../types";
import { identity, timestamps } from "../utils/columns.ts";

export const userTable = pgTable("users", {
  ...identity,
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  // TODO: link existing accounts, then match users by Google ID
  // googleSub: varchar("google_sub", { length: 255 }).unique(),
  image: varchar({ length: 2048 }),
  preferences: jsonb()
    .$type<UserPreferences>()
    .notNull()
    .default({ colorMode: Color.LIGHT, displayName: "", performanceMode: false }),
  ...timestamps,
});

export type SelectUser = InferSelectModel<typeof userTable>;
export type InsertUser = InferInsertModel<typeof userTable>;
