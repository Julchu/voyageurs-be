ALTER TABLE "trip_places" ADD COLUMN "availability" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "visit_date" date;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "visit_start" smallint;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "visit_end" smallint;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD COLUMN "visit_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "start_date" date;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "end_date" date;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_visit_check" CHECK (num_nulls("visit_date", "visit_start", "visit_end") IN (0, 3));--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_visit_time_check" CHECK ("visit_start" >= 0 AND "visit_start" < "visit_end" AND "visit_end" <= 1440);--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_dates_check" CHECK (num_nulls("start_date", "end_date") IN (0, 2) AND "end_date" - "start_date" BETWEEN 0 AND 365);