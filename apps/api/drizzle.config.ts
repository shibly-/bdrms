import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    //url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/bdrms",
    url: "postgresql://neondb_owner:npg_KXYvV5T4cJqP@ep-hidden-heart-ax3k10vr-pooler.c-4.us-east-2.aws.neon.tech/bdrms_db",
  },
});
