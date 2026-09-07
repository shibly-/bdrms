import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';

export type LoadStatus = 'running' | 'consumed' | 'cancelled';

export type LoadRow = {
  id: number;
  buildingId: number;
  buildingName: string | null;
  buildingNo: string | null;
  quantityKg: number;
  costBdt: number;
  status: LoadStatus;
  createdAt: Date | string;
  updatedAt: Date | string;
  previousLoadId: number | null;
  supersededByLoadId: number | null;
};

type Db = PostgresJsDatabase<typeof schema>;
type LoadSelect = typeof schema.loads.$inferSelect;
type BuildingSelect = Pick<
  typeof schema.buildings.$inferSelect,
  'name' | 'buildingNo'
>;

function toNumber(value: string | number): number {
  return Number(value);
}

/** Cost (BDT) / quantity (KG), rounded to 2 decimals. Invalid quantity → 1. */
export function gasPricePerKgFromLoad(
  costBdt: number,
  quantityKg: number,
): number {
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
    return 1;
  }
  const price = costBdt / quantityKg;
  if (!Number.isFinite(price)) {
    return 1;
  }
  return Number(price.toFixed(2));
}

function mapLoad(row: LoadSelect, building?: BuildingSelect | null): LoadRow {
  return {
    id: row.id,
    buildingId: row.buildingId,
    buildingName: building?.name ?? null,
    buildingNo: building?.buildingNo ?? null,
    quantityKg: toNumber(row.quantityKg),
    costBdt: toNumber(row.costBdt),
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    previousLoadId: row.previousLoadId,
    supersededByLoadId: row.supersededByLoadId,
  };
}

function parseQuantity(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new BadRequestException(
      'Current Load Quantity (KG) must be a number greater than 0.',
    );
  }
  return Number(n.toFixed(3));
}

function parseCost(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new BadRequestException(
      'Current Load Cost (BDT) must be a non-negative number.',
    );
  }
  return Number(n.toFixed(2));
}

export function parseBuildingId(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    throw new BadRequestException('Building is required.');
  }
  return Math.trunc(n);
}

@Injectable()
export class LoadsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async assertBuilding(buildingId: number) {
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
    return building;
  }

  async getCurrent(buildingId: number): Promise<{ load: LoadRow | null }> {
    const building = await this.assertBuilding(buildingId);
    const [row] = await this.db
      .select()
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.buildingId, buildingId),
          eq(schema.loads.status, 'running'),
        ),
      )
      .orderBy(desc(schema.loads.id))
      .limit(1);
    return { load: row ? mapLoad(row, building) : null };
  }

  async updateCurrent(input: {
    buildingId: unknown;
    quantityKg: unknown;
    costBdt: unknown;
    createdByUserId?: number | null;
  }): Promise<{ load: LoadRow; replacedLoadId: number | null }> {
    const buildingId = parseBuildingId(input.buildingId);
    const building = await this.assertBuilding(buildingId);
    const quantityKg = parseQuantity(input.quantityKg);
    const costBdt = parseCost(input.costBdt);
    const createdByUserId =
      input.createdByUserId && input.createdByUserId >= 1
        ? input.createdByUserId
        : null;

    const { load: current } = await this.getCurrent(buildingId);
    if (
      current &&
      Number(current.quantityKg.toFixed(3)) === quantityKg &&
      Number(current.costBdt.toFixed(2)) === costBdt
    ) {
      throw new BadRequestException(
        'No changes to save. Update the quantity or cost first.',
      );
    }

    const result = await this.db.transaction(async (tx) => {
      if (current) {
        await tx
          .update(schema.loads)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(schema.loads.id, current.id));
      }

      const [created] = await tx
        .insert(schema.loads)
        .values({
          buildingId,
          quantityKg: quantityKg.toFixed(3),
          costBdt: costBdt.toFixed(2),
          status: 'running',
          previousLoadId: current?.id ?? null,
          createdByUserId,
        })
        .returning();

      if (current) {
        await tx
          .update(schema.loads)
          .set({ supersededByLoadId: created.id })
          .where(eq(schema.loads.id, current.id));
      }

      return { created, replacedLoadId: current?.id ?? null };
    });

    const mapped = mapLoad(result.created, building);
    await this.applyGasPriceToSystemConfig(buildingId);
    return { load: mapped, replacedLoadId: result.replacedLoadId };
  }

  async markConsumed(buildingId: number): Promise<{ load: LoadRow }> {
    const building = await this.assertBuilding(buildingId);
    const { load: current } = await this.getCurrent(buildingId);
    if (!current) {
      throw new NotFoundException('There is no running load to mark as consumed.');
    }

    const [updated] = await this.db
      .update(schema.loads)
      .set({ status: 'consumed', updatedAt: new Date() })
      .where(eq(schema.loads.id, current.id))
      .returning();

    if (!updated) {
      throw new NotFoundException('There is no running load to mark as consumed.');
    }
    const mapped = mapLoad(updated, building);
    await this.applyGasPriceToSystemConfig(buildingId);
    return { load: mapped };
  }

  /**
   * Running load cost/qty for the building; else last Consumed load; else 1.
   */
  async resolveGasPricePerKg(buildingId: number): Promise<number> {
    const { load: running } = await this.getCurrent(buildingId);
    if (running) {
      return gasPricePerKgFromLoad(running.costBdt, running.quantityKg);
    }

    const [consumed] = await this.db
      .select()
      .from(schema.loads)
      .where(
        and(
          eq(schema.loads.buildingId, buildingId),
          eq(schema.loads.status, 'consumed'),
        ),
      )
      .orderBy(desc(schema.loads.id))
      .limit(1);

    if (consumed) {
      return gasPricePerKgFromLoad(
        toNumber(consumed.costBdt),
        toNumber(consumed.quantityKg),
      );
    }

    return 1;
  }

  async applyGasPriceToSystemConfig(buildingId: number): Promise<number> {
    const gasUnitPrice = await this.resolveGasPricePerKg(buildingId);
    const [current] = await this.db
      .select({ id: schema.systemConfigs.id })
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.buildingId, buildingId))
      .limit(1);

    if (current) {
      await this.db
        .update(schema.systemConfigs)
        .set({
          gasUnitPrice: gasUnitPrice.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(schema.systemConfigs.id, current.id));
    }

    return gasUnitPrice;
  }

  async listHistory(buildingId?: number): Promise<{ items: LoadRow[] }> {
    const filters = buildingId
      ? and(
          inArray(schema.loads.status, ['running', 'consumed', 'cancelled']),
          eq(schema.loads.buildingId, buildingId),
        )
      : inArray(schema.loads.status, ['running', 'consumed', 'cancelled']);

    const rows = await this.db
      .select({
        load: schema.loads,
        buildingName: schema.buildings.name,
        buildingNo: schema.buildings.buildingNo,
      })
      .from(schema.loads)
      .innerJoin(
        schema.buildings,
        eq(schema.loads.buildingId, schema.buildings.id),
      )
      .where(filters)
      .orderBy(desc(schema.loads.updatedAt), desc(schema.loads.id));

    return {
      items: rows.map((r) =>
        mapLoad(r.load, { name: r.buildingName, buildingNo: r.buildingNo }),
      ),
    };
  }
}
