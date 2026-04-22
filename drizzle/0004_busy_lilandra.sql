CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"prompt" text NOT NULL,
	"schema_definition" jsonb NOT NULL,
	"model_key" varchar(100) DEFAULT 'google_flash' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"external_doc_id" varchar(255),
	"file_name" varchar(255) NOT NULL,
	"document_type" varchar(100),
	"storage_path" text,
	"file_size" integer,
	"mime_type" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_id" uuid NOT NULL,
	"agent_slug" varchar(100) NOT NULL,
	"pessoa_grupo" varchar(50),
	"extracted_data" jsonb NOT NULL,
	"is_ok" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"model_used" varchar(100),
	"tokens_used" integer,
	"execution_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_audit_id_reservation_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."reservation_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extraction_results" ADD CONSTRAINT "extraction_results_audit_id_reservation_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."reservation_audits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_slug_idx" ON "agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "agents_active_idx" ON "agents" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "documents_audit_id_idx" ON "documents" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "extraction_results_audit_id_idx" ON "extraction_results" USING btree ("audit_id");--> statement-breakpoint
CREATE INDEX "extraction_results_agent_idx" ON "extraction_results" USING btree ("agent_slug");--> statement-breakpoint
CREATE INDEX "extraction_results_pessoa_idx" ON "extraction_results" USING btree ("pessoa_grupo");