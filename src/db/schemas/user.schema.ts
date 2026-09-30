import { jsonb, pgTable, unique, varchar } from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { Color, type UserPreferences } from "../../types";
import {
  type AutomaticFields,
  type PrivateFields,
  requiredColumns,
  timestamps,
} from "../utils/shared-schema.ts";

export const userTable = pgTable(
  "users",
  {
    ...requiredColumns,
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).unique().notNull(),
    image: varchar({ length: 255 }),
    preferences: jsonb()
      .$type<UserPreferences>()
      .default({
        colorMode: Color.LIGHT,
        displayName: "",
        performanceMode: false,
      })
      .notNull(),
    ...timestamps,
  },
  (table) => [unique("unique_user").on(table.publicId), unique("unique_user_email").on(table.email)],
);

export type SelectUser = InferSelectModel<typeof userTable>;
export type InsertUser = InferInsertModel<typeof userTable>;
export type SelectPublicUser = Omit<SelectUser, PrivateFields>;
export type InsertPublicUser = Omit<InsertUser, PrivateFields | AutomaticFields>;
