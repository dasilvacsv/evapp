CREATE TYPE "public"."task_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('follow_up', 'document_request', 'birthday_reminder', 'renewal_reminder', 'address_change', 'claim_follow_up', 'payment_reminder', 'general', 'aor_signature');--> statement-breakpoint
CREATE TYPE "public"."template_type" AS ENUM('income_letter', 'coverage_confirmation', 'renewal_notice', 'birthday_greeting', 'address_change_confirmation', 'general_correspondence');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'call_center';--> statement-breakpoint
CREATE TABLE "customer_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"policy_id" uuid,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "task_type" DEFAULT 'general' NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_id" uuid,
	"created_by_id" uuid NOT NULL,
	"due_date" timestamp,
	"completed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "template_type" NOT NULL,
	"content" text NOT NULL,
	"variables" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"policy_id" uuid,
	"title" varchar(255) NOT NULL,
	"generated_content" text NOT NULL,
	"s3_key" text,
	"generated_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_sale_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "task_type" NOT NULL,
	"priority" "task_priority" DEFAULT 'medium' NOT NULL,
	"status" "task_status" DEFAULT 'pending' NOT NULL,
	"assigned_to_id" uuid,
	"created_by_id" uuid NOT NULL,
	"customer_id" uuid,
	"policy_id" uuid,
	"due_date" timestamp,
	"completed_at" timestamp,
	"board_column" varchar(50) DEFAULT 'pending',
	"position" integer DEFAULT 0,
	"tags" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid,
	"post_sale_task_id" uuid,
	"content" text NOT NULL,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "processing_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "aor_document_id" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "assigned_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "can_download" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_tasks" ADD CONSTRAINT "customer_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tasks" ADD CONSTRAINT "customer_tasks_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tasks" ADD CONSTRAINT "customer_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tasks" ADD CONSTRAINT "customer_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_templates" ADD CONSTRAINT "document_templates_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_template_id_document_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."document_templates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_id_users_id_fk" FOREIGN KEY ("generated_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_sale_tasks" ADD CONSTRAINT "post_sale_tasks_assigned_to_id_users_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_sale_tasks" ADD CONSTRAINT "post_sale_tasks_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_sale_tasks" ADD CONSTRAINT "post_sale_tasks_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_sale_tasks" ADD CONSTRAINT "post_sale_tasks_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_task_id_customer_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."customer_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_post_sale_task_id_post_sale_tasks_id_fk" FOREIGN KEY ("post_sale_task_id") REFERENCES "public"."post_sale_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;