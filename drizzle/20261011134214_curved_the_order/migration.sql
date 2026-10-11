CREATE TABLE "place_searches" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "place_searches_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"query" varchar(500) NOT NULL,
	"name" varchar(255) NOT NULL,
	"street_address" varchar(500) DEFAULT '' NOT NULL,
	"area_address" varchar(500) DEFAULT '' NOT NULL,
	"category" varchar(255) DEFAULT '' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "place_searches_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
	CONSTRAINT "place_searches_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180)
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "refresh_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"jti" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_stops" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trip_stops_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"street_address" varchar(500) DEFAULT '' NOT NULL,
	"area_address" varchar(500) DEFAULT '' NOT NULL,
	"category" varchar(255) DEFAULT '' NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"position" integer NOT NULL,
	"visited" boolean DEFAULT false NOT NULL,
	"visited_at" timestamp,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp,
	CONSTRAINT "trip_stops_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90),
	CONSTRAINT "trip_stops_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180)
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "trips_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"public_id" uuid DEFAULT gen_random_uuid() NOT NULL CONSTRAINT "unique_user" UNIQUE,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL CONSTRAINT "unique_user_email" UNIQUE,
	"image" varchar(255),
	"preferences" jsonb DEFAULT '{"colorMode":"light","displayName":"","performanceMode":false}' NOT NULL,
	"updated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "place_searches_public_id_unique" ON "place_searches" ("public_id");--> statement-breakpoint
CREATE INDEX "place_searches_user_created_idx" ON "place_searches" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_jti_unique" ON "refresh_tokens" ("jti");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trip_stops_public_id_unique" ON "trip_stops" ("public_id");--> statement-breakpoint
CREATE INDEX "trip_stops_trip_position_idx" ON "trip_stops" ("trip_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_public_id_unique" ON "trips" ("public_id");--> statement-breakpoint
CREATE INDEX "trips_user_id_idx" ON "trips" ("user_id");--> statement-breakpoint
ALTER TABLE "place_searches" ADD CONSTRAINT "place_searches_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trip_stops" ADD CONSTRAINT "trip_stops_trip_id_trips_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;