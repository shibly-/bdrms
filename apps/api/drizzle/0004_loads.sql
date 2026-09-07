CREATE TYPE "public"."load_status" AS ENUM('running', 'consumed', 'cancelled');--> statement-breakpoint
CREATE TABLE "loads" (
	"id" serial PRIMARY KEY NOT NULL,
	"quantity_kg" numeric(12, 3) NOT NULL,
	"cost_bdt" numeric(12, 2) NOT NULL,
	"status" "load_status" DEFAULT 'running' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"previous_load_id" integer,
	"superseded_by_load_id" integer,
	"created_by_user_id" integer
);
--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_loads_one_running" ON "loads" USING btree ("status") WHERE "loads"."status" = 'running';--> statement-breakpoint
CREATE INDEX "idx_loads_status_created_at" ON "loads" USING btree ("status","created_at");
