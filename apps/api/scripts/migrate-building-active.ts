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
    ALTER TABLE buildings
      ADD COLUMN IF NOT EXISTS is_active integer NOT NULL DEFAULT 1;
  `);

  console.log('buildings.is_active column ready');
  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
