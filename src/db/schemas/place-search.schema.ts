import { sql } from "drizzle-orm";
import { check, doublePrecision, index, integer, pgTable, varchar } from "drizzle-orm/pg-core";
import { identity, timestamps } from "../utils/columns.ts";
import { userTable } from "./user.schema.ts";

export const placeSearchTable = pgTable(
  "place_searches",
  {
    ...identity,
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    query: varchar({ length: 500 }).notNull(),
    mapboxId: varchar("mapbox_id", { length: 1024 }),
    name: varchar({ length: 255 }).notNull(),
    streetAddress: varchar("street_address", { length: 500 }).notNull().default(""),
    areaAddress: varchar("area_address", { length: 500 }).notNull().default(""),
    category: varchar({ length: 255 }).notNull().default(""),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    ...timestamps,
  },
  (table) => [
    index("place_searches_user_created_idx").on(table.userId, table.createdAt),
    check("place_searches_latitude_check", sql`${table.latitude} BETWEEN -90 AND 90`),
    check("place_searches_longitude_check", sql`${table.longitude} BETWEEN -180 AND 180`),
  ],
);

export type SelectPlaceSearch = typeof placeSearchTable.$inferSelect;
