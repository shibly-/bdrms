CREATE TABLE IF NOT EXISTS "system_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"building_id" integer NOT NULL,
	"gas_unit_name" varchar(40) NOT NULL,
	"gas_unit_price" numeric(12, 2) NOT NULL,
	"operating_cost_per_flat" numeric(12, 2) DEFAULT '1' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_system_configs_building" ON "system_configs" USING btree ("building_id");
--> statement-breakpoint
ALTER TABLE "loads" ADD COLUMN IF NOT EXISTS "building_id" integer;
--> statement-breakpoint
DROP INDEX IF EXISTS "uq_loads_one_running";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_loads_one_running_per_building" ON "loads" USING btree ("building_id") WHERE "loads"."status" = 'running';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_loads_building_status" ON "loads" USING btree ("building_id","status");
