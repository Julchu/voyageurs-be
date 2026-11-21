ALTER TABLE "trip_stops" RENAME COLUMN "visit_date" TO "slot_date";--> statement-breakpoint
ALTER TABLE "trip_stops" RENAME COLUMN "visit_start" TO "slot_start";--> statement-breakpoint
ALTER TABLE "trip_stops" RENAME COLUMN "visit_end" TO "slot_end";--> statement-breakpoint
ALTER TABLE "trip_stops" RENAME COLUMN "visit_locked" TO "slot_locked";--> statement-breakpoint
ALTER TABLE "trip_stops" RENAME CONSTRAINT "trip_stops_visit_check" TO "trip_stops_slot_check";--> statement-breakpoint
ALTER TABLE "trip_stops" RENAME CONSTRAINT "trip_stops_visit_time_check" TO "trip_stops_slot_time_check";
