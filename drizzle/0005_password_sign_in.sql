ALTER TYPE "public"."auth_event_kind" ADD VALUE 'password_failed';--> statement-breakpoint
ALTER TYPE "public"."auth_event_kind" ADD VALUE 'password_changed';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;