CREATE TYPE "reservation" AS ENUM('booked', 'needs_reservation');--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "type" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "details" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "notes" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "url" varchar(2048) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "reservations" "reservation";--> statement-breakpoint
ALTER TABLE "trip_places" ADD COLUMN "price" numeric(12,2);--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_price_check" CHECK ("price" >= 0);