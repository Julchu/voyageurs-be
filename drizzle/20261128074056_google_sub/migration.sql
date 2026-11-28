ALTER TABLE "users" ADD COLUMN "google_sub" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_sub_key" UNIQUE("google_sub");