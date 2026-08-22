import path from 'path';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from '../src/auth/password.util';
import { UserRole } from '../src/common/types';
import * as schema from '../src/database/schema';

config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const url =
    process.env.DATABASE_URL ??
    'postgres://postgres:postgres@localhost:5432/bdrms';

  const client = postgres(url);
  const db = drizzle(client, { schema });

  const tableCheck = await client`
    select count(*)::int as c from information_schema.tables
    where table_schema = 'public' and table_name = 'users'
  `;
  if (!tableCheck[0]?.c) {
    console.error(
      'Table public.users was not found. Apply the Drizzle schema and enum migration first.',
    );
    await client.end({ timeout: 5 });
    process.exit(1);
  }

  const userName = 'buildingadmin';
  const password = process.env.SEED_BUILDING_ADMIN_PASSWORD ?? 'buildingadmin123';
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
        role: UserRole.BuildingAdmin,
        passwordHash,
        fullName: 'Building Administrator',
        isActive: 1,
      })
      .where(eq(schema.users.userName, userName));
    console.log(`Updated user "${userName}" (password and building_admin role).`);
  } else {
    await db.insert(schema.users).values({
      role: UserRole.BuildingAdmin,
      userName,
      fullName: 'Building Administrator',
      passwordHash,
    });
    console.log(`Created building admin user "${userName}".`);
  }

  console.log(`Default password (override with SEED_BUILDING_ADMIN_PASSWORD): ${password}`);

  await client.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
