import path from 'path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const sql = postgres(
    process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/bdrms',
  );

  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
        CREATE TYPE bill_status AS ENUM ('unpaid', 'paid', 'cancelled');
      END IF;
    END $$;

    ALTER TABLE bills ADD COLUMN IF NOT EXISTS status bill_status NOT NULL DEFAULT 'unpaid';
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS update_reason varchar(200);
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS bill_updated_at timestamp;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS previous_bill_id integer;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS superseded_by_bill_id integer;
    ALTER TABLE bills ADD COLUMN IF NOT EXISTS paid_at timestamp;

    DO $$ BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bills'
          AND column_name = 'billing_date'
          AND data_type = 'date'
      ) THEN
        ALTER TABLE bills
          ALTER COLUMN billing_date TYPE timestamp
          USING billing_date::timestamp;
      END IF;
    END $$;
  `);

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM bills`;
  console.log(`Migration complete. bills rows: ${count}`);

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
