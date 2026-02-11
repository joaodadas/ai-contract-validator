CREATE TYPE "public"."audit_status" AS ENUM('approved', 'divergent', 'error');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('info', 'warning', 'error');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'approved', 'divergent');--> statement-breakpoint
CREATE TYPE "public"."rule_scope" AS ENUM('global', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."rule_type" AS ENUM('financial', 'documents', 'score', 'enterprise_override');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_audit_id" uuid NOT NULL,
	"level" "log_level" NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservation_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"rule_version" integer NOT NULL,
	"prompt_version" varchar(100) NOT NULL,
	"status" "audit_status" NOT NULL,
	"result_json" jsonb NOT NULL,
	"ai_raw_output" jsonb,
	"execution_time_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" varchar(255) NOT NULL,
	"enterprise" varchar(255) NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "rule_type" NOT NULL,
	"scope" "rule_scope" NOT NULL,
	"enterprise" varchar(255),
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_reservation_audit_id_reservation_audits_id_fk" FOREIGN KEY ("reservation_audit_id") REFERENCES "public"."reservation_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservation_audits" ADD CONSTRAINT "reservation_audits_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_reservation_audit_id_idx" ON "audit_logs" USING btree ("reservation_audit_id");--> statement-breakpoint
CREATE INDEX "audit_logs_level_idx" ON "audit_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reservation_audits_reservation_id_idx" ON "reservation_audits" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "reservation_audits_status_idx" ON "reservation_audits" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reservation_audits_created_at_idx" ON "reservation_audits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "reservations_external_id_idx" ON "reservations" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "reservations_enterprise_idx" ON "reservations" USING btree ("enterprise");--> statement-breakpoint
CREATE INDEX "reservations_status_idx" ON "reservations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "rule_configs_type_idx" ON "rule_configs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "rule_configs_scope_idx" ON "rule_configs" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "rule_configs_enterprise_idx" ON "rule_configs" USING btree ("enterprise");--> statement-breakpoint
CREATE INDEX "rule_configs_active_idx" ON "rule_configs" USING btree ("type","scope","enterprise","is_active");