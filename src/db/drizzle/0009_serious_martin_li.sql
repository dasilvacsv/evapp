CREATE TABLE "declared_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"relationship" varchar(100) NOT NULL,
	"immigration_status" "immigration_status",
	"immigration_status_other" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "account_holder_name" varchar(255);--> statement-breakpoint
ALTER TABLE "declared_people" ADD CONSTRAINT "declared_people_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;