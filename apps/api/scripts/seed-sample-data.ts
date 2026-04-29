import path from 'path';
import { config } from 'dotenv';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hashPassword } from '../src/auth/password.util';
import { UserRole } from '../src/common/types';
import * as schema from '../src/database/schema';

config({ path: path.join(__dirname, '..', '.env') });

type StandardSeed = {
  userName: string;
  fullName: string;
  phone: string;
  email: string;
  buildingId: number;
  flatId: number;
  gasMeterNo: string;
};

type StaffSeed = {
  userName: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  operationArea: string;
};

const PASSWORD = 'admin123';
const UNIT_PRICE = 12.5;

const staffSeeds: StaffSeed[] = [
  {
    userName: 'staff.olivia',
    fullName: 'Olivia Carter',
    phone: '+8801700000001',
    email: 'olivia.carter@example.com',
    address: 'Block A, Banani',
    operationArea: 'North Zone',
  },
  {
    userName: 'staff.ethan',
    fullName: 'Ethan Walker',
    phone: '+8801700000002',
    email: 'ethan.walker@example.com',
    address: 'Road 12, Gulshan',
    operationArea: 'Central Zone',
  },
];

const userSeeds: StandardSeed[] = [
  {
    userName: 'john.smith',
    fullName: 'John Smith',
    phone: '+8801800000001',
    email: 'john.smith@example.com',
    buildingId: 1,
    flatId: 1,
    gasMeterNo: 'GM-1001',
  },
  {
    userName: 'emma.johnson',
    fullName: 'Emma Johnson',
    phone: '+8801800000002',
    email: 'emma.johnson@example.com',
    buildingId: 1,
    flatId: 2,
    gasMeterNo: 'GM-1002',
  },
  {
    userName: 'liam.brown',
    fullName: 'Liam Brown',
    phone: '+8801800000003',
    email: 'liam.brown@example.com',
    buildingId: 2,
    flatId: 3,
    gasMeterNo: 'GM-1003',
  },
  {
    userName: 'sophia.davis',
    fullName: 'Sophia Davis',
    phone: '+8801800000004',
    email: 'sophia.davis@example.com',
    buildingId: 1,
    flatId: 1,
    gasMeterNo: 'GM-1004',
  },
  {
    userName: 'noah.miller',
    fullName: 'Noah Miller',
    phone: '+8801800000005',
    email: 'noah.miller@example.com',
    buildingId: 2,
    flatId: 3,
    gasMeterNo: 'GM-1005',
  },
];

const monthDates = ['2026-01-15', '2026-02-15', '2026-03-15'];

async function upsertStaff(
  db: ReturnType<typeof drizzle<typeof schema>>,
  passwordHash: string,
) {
  for (const s of staffSeeds) {
    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.userName, s.userName))
      .limit(1);

    let userId = existing?.id;
    if (!userId) {
      const [created] = await db
        .insert(schema.users)
        .values({
          role: UserRole.Staff,
          userName: s.userName,
          fullName: s.fullName,
          phone: s.phone,
          email: s.email,
          passwordHash,
        })
        .returning({ id: schema.users.id });
      userId = created.id;
      await db.insert(schema.staffProfiles).values({
        userId,
        address: s.address,
        operationArea: s.operationArea,
      });
    } else {
      await db
        .update(schema.users)
        .set({
          role: UserRole.Staff,
          fullName: s.fullName,
          phone: s.phone,
          email: s.email,
          passwordHash,
        })
        .where(eq(schema.users.id, userId));

      const [profile] = await db
        .select({ id: schema.staffProfiles.id })
        .from(schema.staffProfiles)
        .where(eq(schema.staffProfiles.userId, userId))
        .limit(1);
      if (!profile) {
        await db.insert(schema.staffProfiles).values({
          userId,
          address: s.address,
          operationArea: s.operationArea,
        });
      } else {
        await db
          .update(schema.staffProfiles)
          .set({ address: s.address, operationArea: s.operationArea })
          .where(eq(schema.staffProfiles.userId, userId));
      }
    }
  }
}

async function upsertStandardUsers(
  db: ReturnType<typeof drizzle<typeof schema>>,
  passwordHash: string,
) {
  const profileIds: number[] = [];

  for (const u of userSeeds) {
    const [existingUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.userName, u.userName))
      .limit(1);

    let userId = existingUser?.id;
    if (!userId) {
      const [created] = await db
        .insert(schema.users)
        .values({
          role: UserRole.User,
          userName: u.userName,
          fullName: u.fullName,
          phone: u.phone,
          email: u.email,
          passwordHash,
        })
        .returning({ id: schema.users.id });
      userId = created.id;
    } else {
      await db
        .update(schema.users)
        .set({
          role: UserRole.User,
          fullName: u.fullName,
          phone: u.phone,
          email: u.email,
          passwordHash,
        })
        .where(eq(schema.users.id, userId));
    }

    const [existingProfile] = await db
      .select({
        id: schema.standardUserProfiles.id,
      })
      .from(schema.standardUserProfiles)
      .where(eq(schema.standardUserProfiles.userId, userId))
      .limit(1);

    if (!existingProfile) {
      const [createdProfile] = await db
        .insert(schema.standardUserProfiles)
        .values({
          userId,
          buildingId: u.buildingId,
          flatId: u.flatId,
          gasMeterNo: u.gasMeterNo,
          installationDate: '2025-01-01',
          activationDate: '2025-01-05',
        })
        .returning({ id: schema.standardUserProfiles.id });
      profileIds.push(createdProfile.id);
    } else {
      await db
        .update(schema.standardUserProfiles)
        .set({
          buildingId: u.buildingId,
          flatId: u.flatId,
          gasMeterNo: u.gasMeterNo,
        })
        .where(eq(schema.standardUserProfiles.id, existingProfile.id));
      profileIds.push(existingProfile.id);
    }
  }

  return profileIds;
}

async function upsertSampleBills(
  db: ReturnType<typeof drizzle<typeof schema>>,
  profileIds: number[],
) {
  for (let userIndex = 0; userIndex < profileIds.length; userIndex += 1) {
    const profileId = profileIds[userIndex];
    for (let monthIndex = 0; monthIndex < monthDates.length; monthIndex += 1) {
      const billingDate = monthDates[monthIndex];
      const previousReading = monthIndex * 100 + userIndex * 10 + 50;
      const currentReading = previousReading + 22 + monthIndex * 3 + userIndex;
      const usageQuantity = currentReading - previousReading;
      const totalBill = usageQuantity * UNIT_PRICE;

      const [existing] = await db
        .select({ id: schema.bills.id })
        .from(schema.bills)
        .where(
          and(
            eq(schema.bills.standardUserId, profileId),
            eq(schema.bills.billingDate, billingDate),
          ),
        )
        .limit(1);

      if (!existing) {
        await db.insert(schema.bills).values({
          standardUserId: profileId,
          billingDate,
          previousReading: String(previousReading),
          currentReading: String(currentReading),
          usageQuantity: String(usageQuantity),
          unitPrice: String(UNIT_PRICE),
          totalBill: String(totalBill),
          ocrImageUrl: null,
        });
      } else {
        await db
          .update(schema.bills)
          .set({
            previousReading: String(previousReading),
            currentReading: String(currentReading),
            usageQuantity: String(usageQuantity),
            unitPrice: String(UNIT_PRICE),
            totalBill: String(totalBill),
          })
          .where(eq(schema.bills.id, existing.id));
      }
    }
  }
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/bdrms';
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  const passwordHash = await hashPassword(PASSWORD);

  await upsertStaff(db, passwordHash);
  const profileIds = await upsertStandardUsers(db, passwordHash);
  await upsertSampleBills(db, profileIds);

  console.log('Sample data seed complete.');
  console.log(
    `Created/updated: ${staffSeeds.length} staff, ${userSeeds.length} users, ${userSeeds.length * monthDates.length} bills.`,
  );
  await client.end({ timeout: 5 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
