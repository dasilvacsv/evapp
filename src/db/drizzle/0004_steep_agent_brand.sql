ALTER TABLE "policies" RENAME COLUMN "policy_number" TO "marketplace_id";--> statement-breakpoint
ALTER TABLE "customers" ALTER COLUMN "ssn" SET DATA TYPE varchar(9);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "zip_code" varchar(10);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "dependent_id" uuid;--> statement-breakpoint
ALTER TABLE "policies" ADD COLUMN "plan_name" varchar(255);--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_dependent_id_dependents_id_fk" FOREIGN KEY ("dependent_id") REFERENCES "public"."dependents"("id") ON DELETE set null ON UPDATE no action;