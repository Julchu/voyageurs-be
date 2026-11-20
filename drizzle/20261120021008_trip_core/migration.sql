CREATE TABLE "place_searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"user_id" integer NOT NULL,
	"query" varchar(500) NOT NULL,
	"mapbox_id" varchar(1024),
	"name" varchar(255) NOT NULL,
	"street_address" varchar(500) DEFAULT '' NOT NULL,
	"area_address" varchar(500) DEFAULT '' NOT NULL,
	"category" varchar(255) DEFAULT '' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "place_searches_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90),
	CONSTRAINT "place_searches_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"jti" uuid NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_places" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trip_places_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"trip_id" integer NOT NULL,
	"place_key" varchar(1024) NOT NULL,
	"mapbox_id" varchar(1024),
	"name" varchar(255) NOT NULL,
	"street_address" varchar(500) DEFAULT '' NOT NULL,
	"area_address" varchar(500) DEFAULT '' NOT NULL,
	"category" varchar(255) DEFAULT '' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "trip_places_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90),
	CONSTRAINT "trip_places_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180)
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trip_stops_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"trip_id" integer NOT NULL,
	"place_id" integer NOT NULL,
	"position" integer NOT NULL,
	"visited" boolean DEFAULT false NOT NULL,
	"visited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trips_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL UNIQUE,
	"image" varchar(2048),
	"preferences" jsonb DEFAULT '{"colorMode":"light","displayName":"","performanceMode":false}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "place_searches_user_created_idx" ON "place_searches" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_places_trip_key_unique" ON "trip_places" ("trip_id","place_key");--> statement-breakpoint
CREATE INDEX "trip_stops_trip_position_idx" ON "trip_stops" ("trip_id","position");--> statement-breakpoint
CREATE INDEX "trip_stops_place_id_idx" ON "trip_stops" ("place_id");--> statement-breakpoint
CREATE INDEX "trips_user_id_idx" ON "trips" ("user_id");--> statement-breakpoint
ALTER TABLE "place_searches" ADD CONSTRAINT "place_searches_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_places" ADD CONSTRAINT "trip_places_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_place_id_trip_places_id_fkey" FOREIGN KEY ("place_id") REFERENCES "trip_places"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;