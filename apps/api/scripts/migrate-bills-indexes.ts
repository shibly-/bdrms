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
    CREATE INDEX IF NOT EXISTS idx_bills_standard_user_billing_date
      ON bills USING btree (standard_user_id, billing_date, id);

    CREATE INDEX IF NOT EXISTS idx_bills_status_billing_date
      ON bills USING btree (status, billing_date);

    CREATE INDEX IF NOT EXISTS idx_bills_billing_date
      ON bills USING btree (billing_date);
  `);

  const indexes = await sql<{ indexname: string }[]>`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'bills'
    ORDER BY indexname
  `;
  console.log(
    'bills indexes:',
    indexes.map((row) => row.indexname).join(', '),
  );

  await sql.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
