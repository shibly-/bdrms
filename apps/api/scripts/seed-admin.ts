import path from 'path';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from '../src/auth/password.util';
import * as schema from '../src/database/schema';

config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url =
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/bdrms';

  const client = postgres(url);
  const db = drizzle(client, { schema });

  const dbCheck = await client`select current_database() as d`;
  console.log('Database:', dbCheck[0]?.d);

  const tableCheck = await client`
    select count(*)::int as c from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  `;
  if (!tableCheck[0]?.c) {
    console.error(
      'Table public.users was not found. Apply the Drizzle schema first (e.g. npm run db:push -w api, or run the SQL in apps/api/drizzle/).',
    );
    await client.end({ timeout: 5 });
    process.exit(1);
  }

  const userName = 'admin';
  const password = 'admin123';
  const passwordHash = await hashPassword(password);

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.userName, userName))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.users)
      .set({
        role: 'admin',
        passwordHash,
        fullName: 'System Administrator',
        isActive: 1,
      })
      .where(eq(schema.users.userName, userName));
    console.log(`Updated user "${userName}" (password and admin role).`);
  } else {
    await db.insert(schema.users).values({
      role: 'admin',
      userName,
      fullName: 'System Administrator',
      passwordHash,
    });
    console.log(`Created admin user "${userName}".`);
  }

  await client.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
