import { sql } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { requiredColumns, timestamps } from "../utils/shared-schema.ts";
import { userTable } from "./user.schema.ts";

export const placeSearchTable = pgTable(
  "place_searches",
  {
    ...requiredColumns,
    userId: integer("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    query: varchar({ length: 500 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    address: varchar({ length: 500 }).notNull().default(""),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("place_searches_public_id_unique").on(table.publicId),
    index("place_searches_user_created_idx").on(table.userId, table.createdAt),
    check(
      "place_searches_latitude_check",
      sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`,
    ),
    check(
      "place_searches_longitude_check",
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
  ],
);

export type SelectPlaceSearch = InferSelectModel<typeof placeSearchTable>;
export type InsertPlaceSearch = InferInsertModel<typeof placeSearchTable>;
