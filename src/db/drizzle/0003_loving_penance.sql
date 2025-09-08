CREATE TYPE "public"."document_type" AS ENUM('foreign_passport', 'drivers_license', 'credentials', 'work_permit_ssn_card', 'ssn_card', 'work_student_visa_holder', 'permanent_residence', 'voter_registration', 'citizen_passport', 'marriage_certificate');--> statement-breakpoint
CREATE TYPE "public"."payment_method_type" AS ENUM('debit_card', 'credit_card', 'bank_account');--> statement-breakpoint
CREATE TYPE "public"."tax_declaration_type" AS ENUM('w2', '1099', 'not_yet_declared');--> statement-breakpoint
CREATE TABLE "dependents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"relationship" varchar(100),
	"birth_date" date,
	"immigration_status" "immigration_status",
	"applies_to_policy" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"policy_id" uuid,
	"s3_key" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(100) NOT NULL,
	"file_size" integer NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "documents_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"policy_id" uuid NOT NULL,
	"method_type" "payment_method_type" NOT NULL,
	"provider" varchar(50),
	"provider_token" text NOT NULL,
	"card_brand" varchar(50),
	"card_last_4" varchar(4),
	"card_expiration" varchar(7),
	"bank_name" varchar(100),
	"account_last_4" varchar(4),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_methods_provider_token_unique" UNIQUE("provider_token")
);
--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "gender" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."gender";--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "gender" SET DATA TYPE "public"."gender" USING "gender"::"public"."gender";--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "immigration_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "dependents" ALTER COLUMN "immigration_status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."immigration_status";--> statement-breakpoint
CREATE TYPE "public"."immigration_status" AS ENUM('citizen', 'green_card', 'work_permit_ssn', 'u_visa', 'political_asylum', 'parole', 'notice_of_action', 'other');--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "immigration_status" SET DATA TYPE "public"."immigration_status" USING "immigration_status"::"public"."immigration_status";--> statement-breakpoint
ALTER TABLE "dependents" ALTER COLUMN "immigration_status" SET DATA TYPE "public"."immigration_status" USING "immigration_status"::"public"."immigration_status";--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "tax_type" SET DATA TYPE "public"."tax_declaration_type" USING "tax_type"::text::"public"."tax_declaration_type";--> statement-breakpoint
ALTER TABLE "policies" ALTER COLUMN "status" SET DEFAULT 'in_review';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "applies_to_coverage" boolean;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "document_type" "document_type";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "county" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "state" varchar(100);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "declares_other_people" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "policy_number" varchar(100);--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "effective_date" date;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "plan_link" text;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "tax_credit" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "aor_link" text;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_policy_id_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
DROP TYPE "public"."tax_type";