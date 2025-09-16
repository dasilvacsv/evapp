ALTER TABLE "customers" ALTER COLUMN "document_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."document_type";--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('foreign_passport', 'drivers_license', 'state_id', 'work_permit_ssn_card', 'permanent_residence', 'citizen_passport', 'birth_certificate', 'naturalization_certificate', 'employment_authorization', 'income_proof', 'tax_return', 'other');--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "document_type" SET DATA TYPE "public"."document_type" USING "document_type"::"public"."document_type";--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "immigration_status_other" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "document_type_other" text;--> statement-breakpoint
ALTER TABLE "dependents" ADD COLUMN "immigration_status_other" text;