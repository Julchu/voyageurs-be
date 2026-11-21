ALTER TABLE "trip_places" ADD COLUMN "availability" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "slot_date" date;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "slot_start" smallint;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "slot_end" smallint;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "slot_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_slot_check" CHECK (num_nulls("slot_date", "slot_start", "slot_end") IN (0, 3));--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_slot_time_check" CHECK ("slot_start" >= 0 AND "slot_start" < "slot_end" AND "slot_end" <= 1440);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_dates_check" CHECK (num_nulls("start_date", "end_date") IN (0, 2) AND "end_date" - "start_date" BETWEEN 0 AND 365);