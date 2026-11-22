CREATE TYPE "public"."body_style" AS ENUM('dl_model', 'sl_model', 'loader', 'three_wheeler');--> statement-breakpoint
ALTER TABLE "product" ADD COLUMN "body_style" "body_style";--> statement-breakpoint
ALTER TABLE "category" DROP COLUMN "body_style";