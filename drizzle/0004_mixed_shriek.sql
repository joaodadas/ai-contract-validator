CREATE TYPE "public"."user_role" AS ENUM('admin', 'auditor');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'auditor' NOT NULL;