CREATE INDEX IF NOT EXISTS "idx_bills_standard_user_billing_date" ON "bills" USING btree ("standard_user_id","billing_date","id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_status_billing_date" ON "bills" USING btree ("status","billing_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bills_billing_date" ON "bills" USING btree ("billing_date");
