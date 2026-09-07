import { relations, sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'building_admin',
  'staff',
  'user',
]);

export const billStatusEnum = pgEnum('bill_status', [
  'unpaid',
  'paid',
  'cancelled',
]);

export const loadStatusEnum = pgEnum('load_status', [
  'running',
  'consumed',
  'cancelled',
]);

export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  buildingNo: varchar('building_no', { length: 60 }),
  address1: varchar('address_1', { length: 220 }).notNull(),
  address2: varchar('address_2', { length: 220 }).notNull(),
  postCode: varchar('post_code', { length: 20 }).notNull(),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const flats = pgTable(
  'flats',
  {
    id: serial('id').primaryKey(),
    flatNo: varchar('flat_no', { length: 50 }).notNull(),
    buildingId: integer('building_id')
      .references(() => buildings.id, { onDelete: 'cascade' })
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    buildingFlatUnique: uniqueIndex('uq_flats_building_flat').on(
      table.buildingId,
      table.flatNo,
    ),
  }),
);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  role: userRoleEnum('role').notNull().default('user'),
  userName: varchar('user_name', { length: 120 }).notNull(),
  fullName: varchar('full_name', { length: 180 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 180 }),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const standardUserProfiles = pgTable('standard_user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  buildingId: integer('building_id')
    .references(() => buildings.id, { onDelete: 'restrict' })
    .notNull(),
  flatId: integer('flat_id')
    .references(() => flats.id, { onDelete: 'restrict' })
    .notNull(),
  gasMeterNo: varchar('gas_meter_no', { length: 80 }).notNull(),
  installationDate: date('installation_date'),
  activationDate: date('activation_date'),
});

export const staffProfiles = pgTable('staff_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  address: text('address'),
  operationArea: varchar('operation_area', { length: 120 }),
});

export const systemConfigs = pgTable(
  'system_configs',
  {
    id: serial('id').primaryKey(),
    buildingId: integer('building_id')
      .references(() => buildings.id, { onDelete: 'cascade' })
      .notNull(),
    gasUnitName: varchar('gas_unit_name', { length: 40 }).notNull(),
    gasUnitPrice: numeric('gas_unit_price', {
      precision: 12,
      scale: 2,
    }).notNull(),
    operatingCostPerFlat: numeric('operating_cost_per_flat', {
      precision: 12,
      scale: 2,
    })
      .notNull()
      .default('1'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    buildingUnique: uniqueIndex('uq_system_configs_building').on(
      table.buildingId,
    ),
  }),
);

export const bills = pgTable(
  'bills',
  {
    id: serial('id').primaryKey(),
    standardUserId: integer('standard_user_id')
      .references(() => standardUserProfiles.id, { onDelete: 'cascade' })
      .notNull(),
    billingDate: timestamp('billing_date', { mode: 'string' }).notNull(),
    previousReading: numeric('previous_reading', { precision: 12, scale: 3 }),
    currentReading: numeric('current_reading', {
      precision: 12,
      scale: 3,
    }).notNull(),
    usageQuantity: numeric('usage_quantity', {
      precision: 12,
      scale: 3,
    }).notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    totalBill: numeric('total_bill', { precision: 12, scale: 2 }).notNull(),
    ocrImageUrl: text('ocr_image_url'),
    status: billStatusEnum('status').notNull().default('unpaid'),
    updateReason: varchar('update_reason', { length: 200 }),
    billUpdatedAt: timestamp('bill_updated_at'),
    // Self-referencing links (kept as plain integers to avoid self-FK typing).
    previousBillId: integer('previous_bill_id'),
    supersededByBillId: integer('superseded_by_bill_id'),
    paidAt: timestamp('paid_at'),
    createdByUserId: integer('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    /** Latest bill / history per resident, including ORDER BY billing_date, id. */
    userBillingDateIdx: index('idx_bills_standard_user_billing_date').on(
      table.standardUserId,
      table.billingDate,
      table.id,
    ),
    /** Unpaid list and history filtered by status + month. */
    statusBillingDateIdx: index('idx_bills_status_billing_date').on(
      table.status,
      table.billingDate,
    ),
    /** Usage date range and monthly dashboard aggregation. */
    billingDateIdx: index('idx_bills_billing_date').on(table.billingDate),
  }),
);

export const loads = pgTable(
  'loads',
  {
    id: serial('id').primaryKey(),
    buildingId: integer('building_id')
      .references(() => buildings.id, { onDelete: 'restrict' })
      .notNull(),
    quantityKg: numeric('quantity_kg', { precision: 12, scale: 3 }).notNull(),
    costBdt: numeric('cost_bdt', { precision: 12, scale: 2 }).notNull(),
    status: loadStatusEnum('status').notNull().default('running'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    previousLoadId: integer('previous_load_id'),
    supersededByLoadId: integer('superseded_by_load_id'),
    createdByUserId: integer('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
  },
  (table) => ({
    oneRunningPerBuilding: uniqueIndex('uq_loads_one_running_per_building')
      .on(table.buildingId)
      .where(sql`${table.status} = 'running'`),
    statusCreatedIdx: index('idx_loads_status_created_at').on(
      table.status,
      table.createdAt,
    ),
    buildingStatusIdx: index('idx_loads_building_status').on(
      table.buildingId,
      table.status,
    ),
  }),
);

export const buildingRelations = relations(buildings, ({ many }) => ({
  flats: many(flats),
}));

export const flatRelations = relations(flats, ({ one }) => ({
  building: one(buildings, {
    fields: [flats.buildingId],
    references: [buildings.id],
  }),
}));
