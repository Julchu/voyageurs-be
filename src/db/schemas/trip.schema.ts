import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { identity, timestamps, timestamptz } from "../utils/columns.ts";
import { userTable } from "./user.schema.ts";

export const tripTable = pgTable(
  "trips",
  {
    ...identity,
    userId: integer("user_id")
      .notNull()
      .references(() => userTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    // Bumped by every save, so a stale version means the trip changed elsewhere.
    version: integer().notNull().default(1),
    ...timestamps,
  },
  (table) => [index("trips_user_id_idx").on(table.userId)],
);

/** A destination, once per trip. Every stop there shares its details. */
export const tripPlaceTable = pgTable(
  "trip_places",
  {
    ...identity,
    tripId: integer("trip_id")
      .notNull()
      .references(() => tripTable.id, { onDelete: "cascade" }),
    // Mapbox ID, or "lat,lng" without one.
    placeKey: varchar("place_key", { length: 1024 }).notNull(),
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
    uniqueIndex("trip_places_trip_key_unique").on(table.tripId, table.placeKey),
    check("trip_places_latitude_check", sql`${table.latitude} BETWEEN -90 AND 90`),
    check("trip_places_longitude_check", sql`${table.longitude} BETWEEN -180 AND 180`),
  ],
);

/** One row in the trip list, at a place. */
export const tripStopTable = pgTable(
  "trip_stops",
  {
    ...identity,
    tripId: integer("trip_id")
      .notNull()
      .references(() => tripTable.id, { onDelete: "cascade" }),
    placeId: integer("place_id")
      .notNull()
      .references(() => tripPlaceTable.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    visited: boolean().notNull().default(false),
    visitedAt: timestamptz("visited_at"),
    ...timestamps,
  },
  (table) => [
    index("trip_stops_trip_position_idx").on(table.tripId, table.position),
    index("trip_stops_place_id_idx").on(table.placeId),
  ],
);

export type SelectTrip = InferSelectModel<typeof tripTable>;
export type InsertTrip = InferInsertModel<typeof tripTable>;
export type SelectTripPlace = InferSelectModel<typeof tripPlaceTable>;
export type InsertTripPlace = InferInsertModel<typeof tripPlaceTable>;
