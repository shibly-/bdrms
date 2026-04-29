CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff', 'user');--> statement-breakpoint
CREATE TABLE "bills" (
	"id" serial PRIMARY KEY NOT NULL,
	"standard_user_id" integer NOT NULL,
	"billing_date" date NOT NULL,
	"previous_reading" numeric(12, 3),
	"current_reading" numeric(12, 3) NOT NULL,
	"usage_quantity" numeric(12, 3) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_bill" numeric(12, 2) NOT NULL,
	"ocr_image_url" text,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buildings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"building_no" varchar(60),
	"address_1" varchar(220) NOT NULL,
	"address_2" varchar(220) NOT NULL,
	"post_code" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flats" (
	"id" serial PRIMARY KEY NOT NULL,
	"flat_no" varchar(50) NOT NULL,
	"building_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"address" text,
	"operation_area" varchar(120)
);
--> statement-breakpoint
CREATE TABLE "standard_user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"building_id" integer NOT NULL,
	"flat_id" integer NOT NULL,
	"gas_meter_no" varchar(80) NOT NULL,
	"installation_date" date,
	"activation_date" date
);
--> statement-breakpoint
CREATE TABLE "system_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"gas_unit_name" varchar(40) NOT NULL,
	"gas_unit_price" numeric(12, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"user_name" varchar(120) NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"phone" varchar(20),
	"email" varchar(180),
	"password_hash" text NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_standard_user_id_standard_user_profiles_id_fk" FOREIGN KEY ("standard_user_id") REFERENCES "public"."standard_user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bills" ADD CONSTRAINT "bills_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flats" ADD CONSTRAINT "flats_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standard_user_profiles" ADD CONSTRAINT "standard_user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standard_user_profiles" ADD CONSTRAINT "standard_user_profiles_building_id_buildings_id_fk" FOREIGN KEY ("building_id") REFERENCES "public"."buildings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standard_user_profiles" ADD CONSTRAINT "standard_user_profiles_flat_id_flats_id_fk" FOREIGN KEY ("flat_id") REFERENCES "public"."flats"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_flats_building_flat" ON "flats" USING btree ("building_id","flat_no");