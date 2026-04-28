import { relations } from 'drizzle-orm';
import {
  date,
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

export const userRoleEnum = pgEnum('user_role', ['admin', 'staff', 'user']);

export const buildings = pgTable('buildings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  buildingNo: varchar('building_no', { length: 60 }),
  address1: varchar('address_1', { length: 220 }).notNull(),
  address2: varchar('address_2', { length: 220 }).notNull(),
  postCode: varchar('post_code', { length: 20 }).notNull(),
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

export const systemConfigs = pgTable('system_configs', {
  id: serial('id').primaryKey(),
  gasUnitName: varchar('gas_unit_name', { length: 40 }).notNull(),
  gasUnitPrice: numeric('gas_unit_price', {
    precision: 12,
    scale: 2,
  }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  standardUserId: integer('standard_user_id')
    .references(() => standardUserProfiles.id, { onDelete: 'cascade' })
    .notNull(),
  billingDate: date('billing_date').notNull(),
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
  createdByUserId: integer('created_by_user_id').references(() => users.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const buildingRelations = relations(buildings, ({ many }) => ({
  flats: many(flats),
}));

export const flatRelations = relations(flats, ({ one }) => ({
  building: one(buildings, {
    fields: [flats.buildingId],
    references: [buildings.id],
  }),
}));
