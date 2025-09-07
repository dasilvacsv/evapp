CREATE TYPE "public"."batch_status" AS ENUM('pending_approval', 'approved', 'paid');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('pending', 'calculated', 'in_dispute', 'paid');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TYPE "public"."immigration_status" AS ENUM('citizen', 'green_card', 'work_permit', 'other');--> statement-breakpoint
CREATE TYPE "public"."policy_status" AS ENUM('new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs', 'sent_to_carrier', 'approved', 'rejected', 'active', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."tax_type" AS ENUM('w2', '1099');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'manager', 'agent', 'processor', 'commission_analyst', 'customer_service');--> statement-breakpoint
CREATE TABLE "commission_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_description" varchar(100) NOT NULL,
	"status" "batch_status" DEFAULT 'pending_approval' NOT NULL,
	"created_by_analyst_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"calculation_date" timestamp DEFAULT now() NOT NULL,
	"processed_by_analyst_id" uuid NOT NULL,
	"payment_batch_id" uuid
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"gender" "gender",
	"birth_date" date NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"address" text,
	"ssn" text,
	"immigration_status" "immigration_status",
	"tax_type" "tax_type",
	"income" numeric(12, 2),
	"created_by_agent_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"status" "policy_status" DEFAULT 'new_lead' NOT NULL,
	"insurance_company" varchar(100),
	"monthly_premium" numeric(10, 2),
	"assigned_processor_id" uuid,
	"commission_status" "commission_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processor_manager_assignments" (
	"processor_id" uuid NOT NULL,
	"manager_id" uuid NOT NULL,
	CONSTRAINT "processor_manager_assignments_processor_id_manager_id_pk" PRIMARY KEY("processor_id","manager_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"role" "user_role" NOT NULL,
	"manager_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "commission_batches" ADD CONSTRAINT "commission_batches_created_by_analyst_id_users_id_fk" FOREIGN KEY ("created_by_analyst_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_batches" ADD CONSTRAINT "commission_batches_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_processed_by_analyst_id_users_id_fk" FOREIGN KEY ("processed_by_analyst_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_records" ADD CONSTRAINT "commission_records_payment_batch_id_commission_batches_id_fk" FOREIGN KEY ("payment_batch_id") REFERENCES "public"."commission_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_agent_id_users_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policies" ADD CONSTRAINT "policies_assigned_processor_id_users_id_fk" FOREIGN KEY ("assigned_processor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processor_manager_assignments" ADD CONSTRAINT "processor_manager_assignments_processor_id_users_id_fk" FOREIGN KEY ("processor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processor_manager_assignments" ADD CONSTRAINT "processor_manager_assignments_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;