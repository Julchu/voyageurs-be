import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { requiredColumns, timestamps } from "../utils/shared-schema.ts";
import { userTable } from "./user.schema.ts";

export const tripTable = pgTable(
  "trips",
  {
    ...requiredColumns,
    userId: integer("user_id")
      .references(() => userTable.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar({ length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("trips_public_id_unique").on(table.publicId),
    index("trips_user_id_idx").on(table.userId),
  ],
);

export const tripStopTable = pgTable(
  "trip_stops",
  {
    ...requiredColumns,
    tripId: integer("trip_id")
      .references(() => tripTable.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar({ length: 255 }).notNull(),
    streetAddress: varchar("street_address", { length: 500 }).notNull().default(""),
    areaAddress: varchar("area_address", { length: 500 }).notNull().default(""),
    category: varchar({ length: 255 }).notNull().default(""),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    position: integer().notNull(),
    visited: boolean().notNull().default(false),
    visitedAt: timestamp("visited_at"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("trip_stops_public_id_unique").on(table.publicId),
    index("trip_stops_trip_position_idx").on(table.tripId, table.position),
    check("trip_stops_latitude_check", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check(
      "trip_stops_longitude_check",
      sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`,
    ),
  ],
);

export type SelectTrip = InferSelectModel<typeof tripTable>;
export type InsertTrip = InferInsertModel<typeof tripTable>;
export type SelectTripStop = InferSelectModel<typeof tripStopTable>;
export type InsertTripStop = InferInsertModel<typeof tripStopTable>;