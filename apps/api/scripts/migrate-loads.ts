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
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'load_status') THEN
        CREATE TYPE load_status AS ENUM ('running', 'consumed', 'cancelled');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS loads (
      id serial PRIMARY KEY,
      quantity_kg numeric(12, 3) NOT NULL,
      cost_bdt numeric(12, 2) NOT NULL,
      status load_status NOT NULL DEFAULT 'running',
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL,
      previous_load_id integer,
      superseded_by_load_id integer,
      created_by_user_id integer REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS uq_loads_one_running
      ON loads (status)
      WHERE status = 'running';

    CREATE INDEX IF NOT EXISTS idx_loads_status_created_at
      ON loads USING btree (status, created_at);
  `);

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM loads`;
  console.log(`loads table ready. rows: ${count}`);

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
