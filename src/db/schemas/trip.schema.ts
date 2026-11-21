import { type InferInsertModel, type InferSelectModel, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import type { AvailabilityWindow } from "../../modules/trip/trip.types.ts";
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
    startDate: date("start_date"),
    endDate: date("end_date"),
    ...timestamps,
  },
  (table) => [
    index("trips_user_id_idx").on(table.userId),
    check(
      "trips_dates_check",
      sql`num_nulls(${table.startDate}, ${table.endDate}) IN (0, 2) AND ${table.endDate} - ${table.startDate} BETWEEN 0 AND 365`,
    ),
  ],
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
    // Weekly open hours; empty means open anytime.
    availability: jsonb().$type<AvailabilityWindow[]>().notNull().default([]),

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
    // A stop's single time slot: one trip day, destination-local minutes.
    slotDate: date("slot_date"),
    slotStart: smallint("slot_start"),
    slotEnd: smallint("slot_end"),
    slotLocked: boolean("slot_locked").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("trip_stops_trip_position_idx").on(table.tripId, table.position),
    index("trip_stops_place_id_idx").on(table.placeId),
    check(
      "trip_stops_slot_check",
      sql`num_nulls(${table.slotDate}, ${table.slotStart}, ${table.slotEnd}) IN (0, 3)`,
    ),
    check(
      "trip_stops_slot_time_check",
      sql`${table.slotStart} >= 0 AND ${table.slotStart} < ${table.slotEnd} AND ${table.slotEnd} <= 1440`,
    ),
  ],
);

export type SelectTrip = InferSelectModel<typeof tripTable>;
export type InsertTrip = InferInsertModel<typeof tripTable>;
export type SelectTripStop = InferSelectModel<typeof tripStopTable>;
export type SelectTripPlace = InferSelectModel<typeof tripPlaceTable>;
export type InsertTripPlace = InferInsertModel<typeof tripPlaceTable>;
