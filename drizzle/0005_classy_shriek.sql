CREATE TABLE "prompt_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent" varchar(64) NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"content" text NOT NULL,
	"notes" text,
	"created_by" integer NOT NULL,
	"activated_by" integer,
	"activated_at" timestamp,
	"deactivated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_configs" ADD CONSTRAINT "prompt_configs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_configs" ADD CONSTRAINT "prompt_configs_activated_by_users_id_fk" FOREIGN KEY ("activated_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_configs_agent_idx" ON "prompt_configs" USING btree ("agent");
CREATE UNIQUE INDEX "prompt_configs_agent_active_key" ON "prompt_configs" ("agent") WHERE "is_active" = true;
CREATE UNIQUE INDEX "prompt_configs_agent_default_key" ON "prompt_configs" ("agent") WHERE "is_default" = true;
CREATE UNIQUE INDEX "prompt_configs_agent_version_unique_key" ON "prompt_configs" ("agent", "version");