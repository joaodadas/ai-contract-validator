ALTER TYPE "public"."reservation_status" ADD VALUE 'confirmed';--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "cvcrm_situacao" varchar(255);