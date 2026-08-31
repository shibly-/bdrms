import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, gte, ilike, inArray, lt, ne, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { BillingPreview } from '../common/types';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

export type GenerateBillInput = {
  previousReading?: number | null;
  currentReading: number;
  unitPrice: number;
  operatingCostPerFlat?: number | null;
};

type BillStatus = 'unpaid' | 'paid' | 'cancelled';

type BillingHistoryFilters = {
  month?: string;
  userName?: string;
  gasMeterNo?: string;
  buildingId?: number;
  flatId?: number;
  statuses?: BillStatus[];
};

type UpdateUnpaidBillInput = {
  billId: number;
  currentReading: number;
  updateReason: string;
  updatedByUserId?: number | null;
};

const MAX_OCR_IMAGE_STORED_CHARS = 6 * 1024 * 1024;

type CreateGasBillInput = {
  flatId: number;
  currentReading: number;
  billingDate: string;
  ocrImageUrl?: string | null;
  createdByUserId?: number | null;
};

type BulkGasBillItem = {
  flatId: number;
  currentReading: number;
};

type CreateBuildingGasBillsInput = {
  buildingId: number;
  items: BulkGasBillItem[];
  createdByUserId?: number | null;
};

/** Present date (YYYY-MM-DD) used as the default billing date in forms. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Present local timestamp as "YYYY-MM-DD HH:MM:SS" for a bill's billing date. */
function nowTimestamp(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * Normalizes a caller-supplied billing date into a full timestamp string. A
 * date-only value (YYYY-MM-DD) is combined with the current time so the stored
 * billing_date carries a meaningful time component.
 */
function toBillingTimestamp(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return nowTimestamp();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed} ${nowTimestamp().slice(11)}`;
  }
  return trimmed;
}

/** Calendar date (YYYY-MM-DD) from a billing timestamp or date-only string. */
function billingDateOnly(value?: string | null): string {
  return toBillingTimestamp(value).slice(0, 10);
}

/** Next calendar day after YYYY-MM-DD, used for same-day timestamp range checks. */
function nextCalendarDay(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
export class BillingService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  calculate(input: GenerateBillInput): BillingPreview {
    const previous = input.previousReading ?? 0;
    const operatingCostPerFlat = input.operatingCostPerFlat ?? 0;
    const usage = Math.max(0, input.currentReading - previous);
    const usageKg = usage * 1.8315;
    const total = usageKg * input.unitPrice + operatingCostPerFlat;

    return {
      previousReading: previous,
      currentReading: input.currentReading,
      usageQuantity: Number(usage.toFixed(3)),
      unitPrice: Number(input.unitPrice.toFixed(2)),
      operatingCostPerFlat: Number(operatingCostPerFlat.toFixed(2)),
      totalBill: Number(total.toFixed(2)),
    };
  }

  /**
   * Placeholder OCR extraction, to be replaced by Tesseract.js or API integration.
   */
  extractReadingFromImage(imageUrl: string): number | null {
    if (!imageUrl) {
      return null;
    }
    const matches = imageUrl.match(/\d+(?:\.\d+)?/g);
    if (!matches || matches.length === 0) return null;
    const value = Number(matches[matches.length - 1]);
    return Number.isFinite(value) ? value : null;
  }

  async getFlatBillingContext(flatId: number) {
    if (!Number.isFinite(flatId) || flatId < 1) {
      throw new BadRequestException('Invalid flatId');
    }

    const [profile] = await this.db
      .select({
        standardUserId: schema.standardUserProfiles.id,
        buildingId: schema.standardUserProfiles.buildingId,
        flatId: schema.standardUserProfiles.flatId,
        gasMeterNo: schema.standardUserProfiles.gasMeterNo,
        userName: schema.users.userName,
        fullName: schema.users.fullName,
        phone: schema.users.phone,
        email: schema.users.email,
      })
      .from(schema.standardUserProfiles)
      .innerJoin(schema.users, eq(schema.standardUserProfiles.userId, schema.users.id))
      .where(eq(schema.standardUserProfiles.flatId, flatId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('No standard user profile found for this flat');
    }

    const [flatRow] = await this.db
      .select({
        flatNo: schema.flats.flatNo,
        buildingId: schema.flats.buildingId,
        buildingNo: schema.buildings.buildingNo,
        buildingName: schema.buildings.name,
        isActive: schema.buildings.isActive,
      })
      .from(schema.flats)
      .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
      .where(eq(schema.flats.id, flatId))
      .limit(1);

    if (flatRow && Number(flatRow.isActive) === 0) {
      throw new BadRequestException('This building is disabled');
    }

    const [latestBill] = await this.db
      .select({
        currentReading: schema.bills.currentReading,
      })
      .from(schema.bills)
      .where(eq(schema.bills.standardUserId, profile.standardUserId))
      .orderBy(desc(schema.bills.billingDate), desc(schema.bills.id))
      .limit(1);

    const [config] = await this.db
      .select({
        gasUnitPrice: schema.systemConfigs.gasUnitPrice,
        operatingCostPerFlat: schema.systemConfigs.operatingCostPerFlat,
      })
      .from(schema.systemConfigs)
      .orderBy(desc(schema.systemConfigs.id))
      .limit(1);

    return {
      standardUserId: profile.standardUserId,
      buildingId: profile.buildingId,
      buildingNo: flatRow?.buildingNo ?? null,
      buildingName: flatRow?.buildingName ?? null,
      flatId: profile.flatId,
      flatNo: flatRow?.flatNo ?? null,
      userName: profile.userName,
      fullName: profile.fullName,
      phone: profile.phone,
      email: profile.email,
      gasMeterNo: profile.gasMeterNo,
      previousReading: latestBill?.currentReading
        ? Number(latestBill.currentReading)
        : 0,
      unitPrice: config?.gasUnitPrice ? Number(config.gasUnitPrice) : 0,
      operatingCostPerFlat: config?.operatingCostPerFlat
        ? Number(config.operatingCostPerFlat)
        : 0,
    };
  }

  async createGasBill(input: CreateGasBillInput) {
    if (
      input.ocrImageUrl != null &&
      input.ocrImageUrl.length > MAX_OCR_IMAGE_STORED_CHARS
    ) {
      throw new BadRequestException('Meter image payload is too large');
    }
    const context = await this.getFlatBillingContext(input.flatId);
    if (!Number.isFinite(input.currentReading) || input.currentReading < 0) {
      throw new BadRequestException('currentReading must be a non-negative number');
    }
    if (input.currentReading <= context.previousReading) {
      throw new BadRequestException(
        'Current reading must be greater than previous reading. A bill cannot be created when previous and current readings are the same.',
      );
    }
    if (!context.unitPrice || context.unitPrice <= 0) {
      throw new BadRequestException('Gas unit price is not configured');
    }
    const preview = this.calculate({
      previousReading: context.previousReading,
      currentReading: input.currentReading,
      unitPrice: context.unitPrice,
      operatingCostPerFlat: context.operatingCostPerFlat,
    });

    const previousReading = preview.previousReading.toFixed(3);
    const currentReading = preview.currentReading.toFixed(3);
    const totalBill = preview.totalBill.toFixed(2);
    const readingDate = billingDateOnly(input.billingDate);
    const readingDateEnd = nextCalendarDay(readingDate);

    const created = await this.db.transaction(async (tx) => {
      await tx
        .select({ id: schema.standardUserProfiles.id })
        .from(schema.standardUserProfiles)
        .where(eq(schema.standardUserProfiles.id, context.standardUserId))
        .for('update');

      const [duplicate] = await tx
        .select({ id: schema.bills.id })
        .from(schema.bills)
        .innerJoin(
          schema.standardUserProfiles,
          eq(schema.bills.standardUserId, schema.standardUserProfiles.id),
        )
        .where(
          and(
            eq(schema.standardUserProfiles.gasMeterNo, context.gasMeterNo),
            gte(schema.bills.billingDate, readingDate),
            lt(schema.bills.billingDate, readingDateEnd),
            eq(schema.bills.previousReading, previousReading),
            eq(schema.bills.currentReading, currentReading),
            eq(schema.bills.totalBill, totalBill),
            ne(schema.bills.status, 'cancelled'),
          ),
        )
        .limit(1);

      if (duplicate) {
        throw new ConflictException(
          'A gas bill with the same Gas Meter No, reading date, previous reading, current reading, and total bill already exists.',
        );
      }

      const [row] = await tx
        .insert(schema.bills)
        .values({
          standardUserId: context.standardUserId,
          billingDate: toBillingTimestamp(input.billingDate),
          previousReading,
          currentReading,
          usageQuantity: preview.usageQuantity.toFixed(3),
          unitPrice: preview.unitPrice.toFixed(2),
          totalBill,
          ocrImageUrl: input.ocrImageUrl ?? null,
          createdByUserId: input.createdByUserId ?? null,
        })
        .returning({
          id: schema.bills.id,
          billingDate: schema.bills.billingDate,
          totalBill: schema.bills.totalBill,
        });

      return row;
    });

    return {
      billId: created.id,
      billingDate: created.billingDate,
      ...preview,
    };
  }

  /**
   * Returns every billable flat (i.e. flats with a resident profile) in a
   * building, together with the gas meter number and last recorded reading.
   * Used by the bulk "add bills for a whole building" workflow.
   */
  async getBuildingBillingContext(buildingId: number) {
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Invalid buildingId');
    }

    const [building] = await this.db
      .select({
        id: schema.buildings.id,
        name: schema.buildings.name,
        buildingNo: schema.buildings.buildingNo,
        isActive: schema.buildings.isActive,
      })
      .from(schema.buildings)
      .where(eq(schema.buildings.id, buildingId))
      .limit(1);

    if (!building) {
      throw new NotFoundException('Building not found');
    }
    if (Number(building.isActive) === 0) {
      throw new BadRequestException('This building is disabled');
    }

    const [config] = await this.db
      .select({
        gasUnitPrice: schema.systemConfigs.gasUnitPrice,
        operatingCostPerFlat: schema.systemConfigs.operatingCostPerFlat,
      })
      .from(schema.systemConfigs)
      .orderBy(desc(schema.systemConfigs.id))
      .limit(1);

    const profiles = await this.db
      .select({
        standardUserId: schema.standardUserProfiles.id,
        flatId: schema.standardUserProfiles.flatId,
        flatNo: schema.flats.flatNo,
        gasMeterNo: schema.standardUserProfiles.gasMeterNo,
        userName: schema.users.userName,
        fullName: schema.users.fullName,
      })
      .from(schema.standardUserProfiles)
      .innerJoin(
        schema.users,
        eq(schema.standardUserProfiles.userId, schema.users.id),
      )
      .innerJoin(
        schema.flats,
        eq(schema.standardUserProfiles.flatId, schema.flats.id),
      )
      .where(eq(schema.standardUserProfiles.buildingId, buildingId))
      .orderBy(schema.flats.flatNo);

    const previousByProfile = new Map<number, number>();
    const profileIds = profiles.map((p) => p.standardUserId);
    if (profileIds.length > 0) {
      const priorBills = await this.db
        .select({
          standardUserId: schema.bills.standardUserId,
          currentReading: schema.bills.currentReading,
        })
        .from(schema.bills)
        .where(inArray(schema.bills.standardUserId, profileIds))
        .orderBy(desc(schema.bills.billingDate), desc(schema.bills.id));
      for (const bill of priorBills) {
        if (!previousByProfile.has(bill.standardUserId)) {
          previousByProfile.set(
            bill.standardUserId,
            bill.currentReading ? Number(bill.currentReading) : 0,
          );
        }
      }
    }

    return {
      building,
      billingDate: today(),
      unitPrice: config?.gasUnitPrice ? Number(config.gasUnitPrice) : 0,
      operatingCostPerFlat: config?.operatingCostPerFlat
        ? Number(config.operatingCostPerFlat)
        : 0,
      flats: profiles.map((p) => ({
        standardUserId: p.standardUserId,
        flatId: p.flatId,
        flatNo: p.flatNo,
        gasMeterNo: p.gasMeterNo,
        userName: p.userName,
        fullName: p.fullName,
        previousReading: previousByProfile.get(p.standardUserId) ?? 0,
      })),
    };
  }

  /**
   * Creates gas bills for submitted flats of a building in one transaction.
   * The billing date is always the present date (server-side), so the caller
   * cannot override it. Flats whose current reading is not greater than the
   * previous reading are skipped (no bill, no total). Rejects the batch if any
   * current reading is missing/invalid or references a flat that is not
   * billable in the building, or if no flat has an increased reading.
   */
  async createGasBillsForBuilding(input: CreateBuildingGasBillsInput) {
    const buildingId = Number(input.buildingId);
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Invalid buildingId');
    }
    if (!Array.isArray(input.items) || input.items.length === 0) {
      throw new BadRequestException('No flats provided for billing');
    }

    const context = await this.getBuildingBillingContext(buildingId);
    if (!context.unitPrice || context.unitPrice <= 0) {
      throw new BadRequestException('Gas unit price is not configured');
    }

    const flatById = new Map(context.flats.map((f) => [f.flatId, f]));

    const prepared: Array<{
      flat: (typeof context.flats)[number];
      preview: BillingPreview;
    }> = [];
    for (const item of input.items) {
      const flatId = Number(item.flatId);
      const flat = flatById.get(flatId);
      if (!flat) {
        throw new BadRequestException(
          `Flat ${item.flatId} is not a billable flat in this building`,
        );
      }
      const currentReading = Number(item.currentReading);
      if (
        item.currentReading === null ||
        (item.currentReading as unknown) === '' ||
        !Number.isFinite(currentReading) ||
        currentReading < 0
      ) {
        throw new BadRequestException(
          `Current reading for flat ${flat.flatNo} must be a non-negative number`,
        );
      }
      if (currentReading <= flat.previousReading) {
        continue;
      }
      const preview = this.calculate({
        previousReading: flat.previousReading,
        currentReading,
        unitPrice: context.unitPrice,
        operatingCostPerFlat: context.operatingCostPerFlat,
      });
      prepared.push({ flat, preview });
    }

    if (prepared.length === 0) {
      throw new BadRequestException(
        'No flats have a current reading greater than the previous reading. Bills were not created.',
      );
    }

    const billingDate = nowTimestamp();
    const createdByUserId =
      input.createdByUserId && input.createdByUserId >= 1
        ? input.createdByUserId
        : null;
    const created = await this.db.transaction(async (tx) => {
      const rows: Array<{ flatId: number; billId: number; totalBill: string }> =
        [];
      for (const { flat, preview } of prepared) {
        const [row] = await tx
          .insert(schema.bills)
          .values({
            standardUserId: flat.standardUserId,
            billingDate,
            previousReading: preview.previousReading.toFixed(3),
            currentReading: preview.currentReading.toFixed(3),
            usageQuantity: preview.usageQuantity.toFixed(3),
            unitPrice: preview.unitPrice.toFixed(2),
            totalBill: preview.totalBill.toFixed(2),
            ocrImageUrl: null,
            createdByUserId,
          })
          .returning({
            id: schema.bills.id,
            totalBill: schema.bills.totalBill,
          });
        rows.push({
          flatId: flat.flatId,
          billId: row.id,
          totalBill: row.totalBill,
        });
      }
      return rows;
    });

    return {
      buildingId,
      billingDate,
      createdCount: created.length,
      bills: created,
    };
  }

  async getCurrentUnitConfig() {
    const [config] = await this.db
      .select({
        gasUnitName: schema.systemConfigs.gasUnitName,
        gasUnitPrice: schema.systemConfigs.gasUnitPrice,
        operatingCostPerFlat: schema.systemConfigs.operatingCostPerFlat
      })
      .from(schema.systemConfigs)
      .orderBy(desc(schema.systemConfigs.id))
      .limit(1);

    if (!config) {
      return {
        gasUnitName: 'Gas Unit',
        gasUnitPrice: 0,
        operatingCostPerFlat: 0,
      };
    }

    return {
      gasUnitName: config.gasUnitName,
      gasUnitPrice: Number(config.gasUnitPrice),
      operatingCostPerFlat: Number(config.operatingCostPerFlat),
    };
  }

  async listBillingHistory(filters: BillingHistoryFilters) {
    const conditions = [];
    if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
      const monthStart = `${filters.month}-01`;
      const [y, m] = filters.month.split('-').map(Number);
      const nextMonth = new Date(Date.UTC(y, m, 1));
      const monthEndExclusive = nextMonth.toISOString().slice(0, 10);
      conditions.push(gte(schema.bills.billingDate, monthStart));
      conditions.push(lt(schema.bills.billingDate, monthEndExclusive));
    }
    if (filters.userName?.trim()) {
      conditions.push(ilike(schema.users.userName, `%${filters.userName.trim()}%`));
    }
    if (filters.gasMeterNo?.trim()) {
      conditions.push(
        ilike(
          schema.standardUserProfiles.gasMeterNo,
          `%${filters.gasMeterNo.trim()}%`,
        ),
      );
    }
    if (filters.buildingId && Number.isFinite(filters.buildingId)) {
      conditions.push(eq(schema.standardUserProfiles.buildingId, filters.buildingId));
    }
    if (filters.flatId && Number.isFinite(filters.flatId)) {
      conditions.push(eq(schema.standardUserProfiles.flatId, filters.flatId));
    }
    if (filters.statuses && filters.statuses.length > 0) {
      conditions.push(inArray(schema.bills.status, filters.statuses));
    }

    const prevBill = alias(schema.bills, 'prev_bill');
    const whereExpr = conditions.length > 0 ? and(...conditions) : undefined;
    const rows = await this.db
      .select({
        billId: schema.bills.id,
        billingDate: schema.bills.billingDate,
        previousReading: schema.bills.previousReading,
        currentReading: schema.bills.currentReading,
        usageQuantity: schema.bills.usageQuantity,
        unitPrice: schema.bills.unitPrice,
        totalBill: schema.bills.totalBill,
        ocrImageUrl: schema.bills.ocrImageUrl,
        status: schema.bills.status,
        updateReason: schema.bills.updateReason,
        billUpdatedAt: schema.bills.billUpdatedAt,
        previousBillId: schema.bills.previousBillId,
        supersededByBillId: schema.bills.supersededByBillId,
        previousBillDate: prevBill.billingDate,
        createdAt: schema.bills.createdAt,
        userName: schema.users.userName,
        fullName: schema.users.fullName,
        gasMeterNo: schema.standardUserProfiles.gasMeterNo,
        buildingName: schema.buildings.name,
        flatNo: schema.flats.flatNo,
      })
      .from(schema.bills)
      .innerJoin(
        schema.standardUserProfiles,
        eq(schema.bills.standardUserId, schema.standardUserProfiles.id),
      )
      .innerJoin(schema.users, eq(schema.standardUserProfiles.userId, schema.users.id))
      .innerJoin(
        schema.buildings,
        eq(schema.standardUserProfiles.buildingId, schema.buildings.id),
      )
      .innerJoin(schema.flats, eq(schema.standardUserProfiles.flatId, schema.flats.id))
      .leftJoin(prevBill, eq(schema.bills.previousBillId, prevBill.id))
      .where(whereExpr)
      .orderBy(desc(schema.bills.billingDate), desc(schema.bills.id))
      .limit(200);

    const total = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.bills)
      .innerJoin(
        schema.standardUserProfiles,
        eq(schema.bills.standardUserId, schema.standardUserProfiles.id),
      )
      .innerJoin(schema.users, eq(schema.standardUserProfiles.userId, schema.users.id))
      .where(whereExpr);

    return {
      total: total[0]?.count ?? 0,
      items: rows,
    };
  }

  /** Returns a single bill's detail row (same shape as history rows). */
  async getBillById(billId: number) {
    if (!Number.isFinite(billId) || billId < 1) {
      throw new BadRequestException('Invalid bill id');
    }
    const prevBill = alias(schema.bills, 'prev_bill');
    const [row] = await this.db
      .select({
        billId: schema.bills.id,
        standardUserId: schema.bills.standardUserId,
        billingDate: schema.bills.billingDate,
        previousReading: schema.bills.previousReading,
        currentReading: schema.bills.currentReading,
        usageQuantity: schema.bills.usageQuantity,
        unitPrice: schema.bills.unitPrice,
        totalBill: schema.bills.totalBill,
        ocrImageUrl: schema.bills.ocrImageUrl,
        status: schema.bills.status,
        updateReason: schema.bills.updateReason,
        billUpdatedAt: schema.bills.billUpdatedAt,
        previousBillId: schema.bills.previousBillId,
        supersededByBillId: schema.bills.supersededByBillId,
        previousBillDate: prevBill.billingDate,
        createdAt: schema.bills.createdAt,
        userName: schema.users.userName,
        fullName: schema.users.fullName,
        gasMeterNo: schema.standardUserProfiles.gasMeterNo,
        buildingName: schema.buildings.name,
        flatNo: schema.flats.flatNo,
      })
      .from(schema.bills)
      .innerJoin(
        schema.standardUserProfiles,
        eq(schema.bills.standardUserId, schema.standardUserProfiles.id),
      )
      .innerJoin(
        schema.users,
        eq(schema.standardUserProfiles.userId, schema.users.id),
      )
      .innerJoin(
        schema.buildings,
        eq(schema.standardUserProfiles.buildingId, schema.buildings.id),
      )
      .innerJoin(
        schema.flats,
        eq(schema.standardUserProfiles.flatId, schema.flats.id),
      )
      .leftJoin(prevBill, eq(schema.bills.previousBillId, prevBill.id))
      .where(eq(schema.bills.id, billId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Bill not found');
    }
    const lastPaidCurrentReading = await this.lastPaidCurrentReadingForUser(
      row.standardUserId,
    );
    return { ...row, lastPaidCurrentReading };
  }

  /**
   * Latest paid bill's current reading for this user, or null if none exists.
   */
  private async lastPaidCurrentReadingForUser(
    standardUserId: number,
  ): Promise<number | null> {
    const [lastPaid] = await this.db
      .select({ currentReading: schema.bills.currentReading })
      .from(schema.bills)
      .where(
        and(
          eq(schema.bills.standardUserId, standardUserId),
          eq(schema.bills.status, 'paid'),
        ),
      )
      .orderBy(desc(schema.bills.billingDate), desc(schema.bills.id))
      .limit(1);
    if (!lastPaid) return null;
    return Number(lastPaid.currentReading ?? 0);
  }

  /** Marks an unpaid bill as paid. Admin-only (enforced at the controller). */
  async markBillPaid(billId: number) {
    if (!Number.isFinite(billId) || billId < 1) {
      throw new BadRequestException('Invalid bill id');
    }
    const [bill] = await this.db
      .select({ id: schema.bills.id, status: schema.bills.status })
      .from(schema.bills)
      .where(eq(schema.bills.id, billId))
      .limit(1);
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    if (bill.status !== 'unpaid') {
      throw new BadRequestException(
        `Only unpaid bills can be marked as paid (current status: ${bill.status})`,
      );
    }
    await this.db
      .update(schema.bills)
      .set({ status: 'paid', paidAt: new Date() })
      .where(eq(schema.bills.id, billId));
    return { billId, status: 'paid' as const };
  }

  /**
   * Updates an unpaid bill's current reading. The existing bill is marked
   * "cancelled" and a new "unpaid" bill (carrying the update reason + a link to
   * the cancelled bill) is created. Admin-only (enforced at the controller).
   */
  async updateUnpaidBill(input: UpdateUnpaidBillInput) {
    const billId = Number(input.billId);
    if (!Number.isFinite(billId) || billId < 1) {
      throw new BadRequestException('Invalid bill id');
    }
    const reason = input.updateReason?.trim();
    if (!reason) {
      throw new BadRequestException('An update reason is required');
    }
    if (reason.length > 200) {
      throw new BadRequestException('Update reason must be 200 characters or fewer');
    }
    const currentReading = Number(input.currentReading);
    if (!Number.isFinite(currentReading) || currentReading < 0) {
      throw new BadRequestException(
        'Current reading must be a non-negative number',
      );
    }

    const [bill] = await this.db
      .select({
        id: schema.bills.id,
        standardUserId: schema.bills.standardUserId,
        billingDate: schema.bills.billingDate,
        previousReading: schema.bills.previousReading,
        usageQuantity: schema.bills.usageQuantity,
        unitPrice: schema.bills.unitPrice,
        totalBill: schema.bills.totalBill,
        ocrImageUrl: schema.bills.ocrImageUrl,
        status: schema.bills.status,
      })
      .from(schema.bills)
      .where(eq(schema.bills.id, billId))
      .limit(1);

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    if (bill.status !== 'unpaid') {
      throw new BadRequestException(
        `Only unpaid bills can be updated (current status: ${bill.status})`,
      );
    }

    const previousReading = Number(bill.previousReading ?? 0);
    const lastPaidCurrentReading = await this.lastPaidCurrentReadingForUser(
      bill.standardUserId,
    );
    if (
      lastPaidCurrentReading != null &&
      currentReading <= lastPaidCurrentReading
    ) {
      throw new BadRequestException(
        `Current reading must be higher than the last paid bill's current reading (${lastPaidCurrentReading}).`,
      );
    }
    if (currentReading <= previousReading) {
      throw new BadRequestException(
        'Current reading must be greater than previous reading. A bill cannot be updated when previous and current readings are the same.',
      );
    }
    const unitPrice = Number(bill.unitPrice);
    // Operating cost isn't stored per-bill; derive it from the original bill so
    // the correction only reflects the reading change.
    const originalUsageKg = Number(bill.usageQuantity) * 1.8315;
    const derivedOperatingCost = Math.max(
      0,
      Number(
        (Number(bill.totalBill) - originalUsageKg * unitPrice).toFixed(2),
      ),
    );

    const preview = this.calculate({
      previousReading,
      currentReading,
      unitPrice,
      operatingCostPerFlat: derivedOperatingCost,
    });

    const updatedByUserId =
      input.updatedByUserId && input.updatedByUserId >= 1
        ? input.updatedByUserId
        : null;

    const result = await this.db.transaction(async (tx) => {
      const [newBill] = await tx
        .insert(schema.bills)
        .values({
          standardUserId: bill.standardUserId,
          billingDate: bill.billingDate,
          previousReading: preview.previousReading.toFixed(3),
          currentReading: preview.currentReading.toFixed(3),
          usageQuantity: preview.usageQuantity.toFixed(3),
          unitPrice: preview.unitPrice.toFixed(2),
          totalBill: preview.totalBill.toFixed(2),
          ocrImageUrl: bill.ocrImageUrl ?? null,
          status: 'unpaid',
          updateReason: reason,
          billUpdatedAt: new Date(),
          previousBillId: bill.id,
          createdByUserId: updatedByUserId,
        })
        .returning({ id: schema.bills.id });

      await tx
        .update(schema.bills)
        .set({ status: 'cancelled', supersededByBillId: newBill.id })
        .where(eq(schema.bills.id, bill.id));

      return { newBillId: newBill.id };
    });

    return {
      billId: result.newBillId,
      previousBillId: bill.id,
      status: 'unpaid' as const,
      ...preview,
    };
  }
}
