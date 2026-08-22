import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, gte, ilike, lt, sql } from 'drizzle-orm';
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

type BillingHistoryFilters = {
  month?: string;
  userName?: string;
  gasMeterNo?: string;
  buildingId?: number;
  flatId?: number;
};

const MAX_OCR_IMAGE_STORED_CHARS = 6 * 1024 * 1024;

type CreateGasBillInput = {
  flatId: number;
  currentReading: number;
  billingDate: string;
  ocrImageUrl?: string | null;
  createdByUserId?: number | null;
};

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
      })
      .from(schema.flats)
      .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
      .where(eq(schema.flats.id, flatId))
      .limit(1);

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
    if (!context.unitPrice || context.unitPrice <= 0) {
      throw new BadRequestException('Gas unit price is not configured');
    }
    const preview = this.calculate({
      previousReading: context.previousReading,
      currentReading: input.currentReading,
      unitPrice: context.unitPrice,
      operatingCostPerFlat: context.operatingCostPerFlat,
    });

    const [created] = await this.db
      .insert(schema.bills)
      .values({
        standardUserId: context.standardUserId,
        billingDate: input.billingDate,
        previousReading: preview.previousReading.toFixed(3),
        currentReading: preview.currentReading.toFixed(3),
        usageQuantity: preview.usageQuantity.toFixed(3),
        unitPrice: preview.unitPrice.toFixed(2),
        totalBill: preview.totalBill.toFixed(2),
        ocrImageUrl: input.ocrImageUrl ?? null,
        createdByUserId: input.createdByUserId ?? null,
      })
      .returning({
        id: schema.bills.id,
        billingDate: schema.bills.billingDate,
        totalBill: schema.bills.totalBill,
      });

    return {
      billId: created.id,
      billingDate: created.billingDate,
      ...preview,
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
}
