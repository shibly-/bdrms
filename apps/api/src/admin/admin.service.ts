import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { hashPassword } from '../auth/password.util';
import { UserRole } from '../common/types';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { LoadsService } from '../loads/loads.service';

type Db = PostgresJsDatabase<typeof schema>;

type CreateBuildingDto = {
  name: string;
  buildingNo?: string;
  address1: string;
  address2: string;
  postCode: string;
};

type UpdateBuildingDto = Partial<CreateBuildingDto>;

type CreateFlatDto = {
  flatNo: string;
  buildingId: number;
};

type UpdateFlatDto = Partial<CreateFlatDto>;

type CreateStandardUserDto = {
  userName: string;
  password: string;
  fullName: string;
  phone?: string;
  email?: string;
  buildingId: number;
  flatId: number;
  gasMeterNo: string;
  installationDate?: string;
  activationDate?: string;
};

type UpdateStandardUserDto = Partial<CreateStandardUserDto> & {
  password?: string;
};

type CreateStaffDto = {
  userName: string;
  password: string;
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  operationArea?: string;
};

type UpdateStaffDto = Partial<CreateStaffDto>;

type SystemConfigDto = {
  buildingId: number;
  gasUnitName: string;
  gasUnitPrice?: number;
  operatingCostPerFlat?: number;
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly loadsService: LoadsService,
  ) {}

  async getDashboardStats() {
    const [usersCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.role, UserRole.User));

    const [staffCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(eq(schema.users.role, UserRole.Staff));

    const [buildingsCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.buildings);

    const [flatsCount] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.flats);

    const monthlyBilling = await this.db.execute(sql<{
      month: string;
      count: number;
    }>`
      SELECT to_char(date_trunc('month', billing_date::date), 'YYYY-MM') AS month,
             count(*)::int AS count
      FROM bills
      GROUP BY 1
      ORDER BY 1
    `);

    return {
      users: usersCount?.count ?? 0,
      staff: staffCount?.count ?? 0,
      buildings: buildingsCount?.count ?? 0,
      flats: flatsCount?.count ?? 0,
      monthlyBillingCounts: monthlyBilling as unknown as { month: string; count: number }[],
    };
  }

  async listBuildings() {
    return this.db.select().from(schema.buildings).orderBy(schema.buildings.id);
  }

  async getBuilding(id: number) {
    const [row] = await this.db
      .select()
      .from(schema.buildings)
      .where(eq(schema.buildings.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Building not found');
    return row;
  }

  async createBuilding(dto: CreateBuildingDto) {
    this.requireText(dto.name, 'name');
    this.requireText(dto.address1, 'address1');
    this.requireText(dto.address2, 'address2');
    this.requireText(dto.postCode, 'postCode');

    const [row] = await this.db
      .insert(schema.buildings)
      .values({
        name: dto.name.trim(),
        buildingNo: dto.buildingNo?.trim() || null,
        address1: dto.address1.trim(),
        address2: dto.address2.trim(),
        postCode: dto.postCode.trim(),
      })
      .returning();

    const [template] = await this.db
      .select({
        gasUnitName: schema.systemConfigs.gasUnitName,
        operatingCostPerFlat: schema.systemConfigs.operatingCostPerFlat,
      })
      .from(schema.systemConfigs)
      .orderBy(schema.systemConfigs.id)
      .limit(1);

    await this.db.insert(schema.systemConfigs).values({
      buildingId: row.id,
      gasUnitName: template?.gasUnitName ?? 'm3',
      gasUnitPrice: '1.00',
      operatingCostPerFlat: template?.operatingCostPerFlat ?? '1.00',
    });

    return row;
  }

  async updateBuilding(id: number, dto: UpdateBuildingDto) {
    await this.getBuilding(id);
    const patch: Partial<typeof schema.buildings.$inferInsert> = {};
    if (dto.name !== undefined) patch.name = this.requireText(dto.name, 'name');
    if (dto.buildingNo !== undefined)
      patch.buildingNo = dto.buildingNo?.trim() || null;
    if (dto.address1 !== undefined)
      patch.address1 = this.requireText(dto.address1, 'address1');
    if (dto.address2 !== undefined)
      patch.address2 = this.requireText(dto.address2, 'address2');
    if (dto.postCode !== undefined)
      patch.postCode = this.requireText(dto.postCode, 'postCode');

    const [row] = await this.db
      .update(schema.buildings)
      .set(patch)
      .where(eq(schema.buildings.id, id))
      .returning();
    return row;
  }

  async setBuildingActive(id: number, isActive: boolean) {
    await this.getBuilding(id);
    const [row] = await this.db
      .update(schema.buildings)
      .set({ isActive: isActive ? 1 : 0 })
      .where(eq(schema.buildings.id, id))
      .returning();
    return row;
  }

  async listFlats() {
    return this.db
      .select({
        id: schema.flats.id,
        flatNo: schema.flats.flatNo,
        buildingId: schema.flats.buildingId,
        buildingName: schema.buildings.name,
      })
      .from(schema.flats)
      .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
      .orderBy(schema.flats.id);
  }

  async getFlat(id: number) {
    const [row] = await this.db
      .select({
        id: schema.flats.id,
        flatNo: schema.flats.flatNo,
        buildingId: schema.flats.buildingId,
        buildingName: schema.buildings.name,
      })
      .from(schema.flats)
      .innerJoin(schema.buildings, eq(schema.flats.buildingId, schema.buildings.id))
      .where(eq(schema.flats.id, id))
      .limit(1);
    if (!row) throw new NotFoundException('Flat not found');
    return row;
  }

  async createFlat(dto: CreateFlatDto) {
    const flatNo = this.requireText(dto.flatNo, 'flatNo');
    await this.ensureBuildingExists(dto.buildingId);
    const [row] = await this.db
      .insert(schema.flats)
      .values({
        flatNo,
        buildingId: dto.buildingId,
      })
      .returning();
    return row;
  }

  async updateFlat(id: number, dto: UpdateFlatDto) {
    await this.getFlat(id);
    const patch: Partial<typeof schema.flats.$inferInsert> = {};
    if (dto.flatNo !== undefined) patch.flatNo = this.requireText(dto.flatNo, 'flatNo');
    if (dto.buildingId !== undefined) {
      await this.ensureBuildingExists(dto.buildingId);
      patch.buildingId = dto.buildingId;
    }
    const [row] = await this.db
      .update(schema.flats)
      .set(patch)
      .where(eq(schema.flats.id, id))
      .returning();
    return row;
  }

  async deleteFlat(id: number) {
    await this.getFlat(id);
    await this.db.delete(schema.flats).where(eq(schema.flats.id, id));
    return { deleted: true };
  }

  async listStandardUsers() {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, UserRole.User))
      .orderBy(schema.users.id);
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const profiles = await this.db
      .select()
      .from(schema.standardUserProfiles)
      .where(inArray(schema.standardUserProfiles.userId, userIds));

    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    return users.map((u) => ({ ...u, profile: profileMap.get(u.id) ?? null }));
  }

  async getStandardUser(id: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), eq(schema.users.role, UserRole.User)))
      .limit(1);
    if (!user) throw new NotFoundException('Standard user not found');

    const [profile] = await this.db
      .select()
      .from(schema.standardUserProfiles)
      .where(eq(schema.standardUserProfiles.userId, user.id))
      .limit(1);

    return { ...user, profile: profile ?? null };
  }

  async createStandardUser(dto: CreateStandardUserDto) {
    const userName = this.requireText(dto.userName, 'userName');
    const fullName = this.requireText(dto.fullName, 'fullName');
    const gasMeterNo = this.requireText(dto.gasMeterNo, 'gasMeterNo');
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    await this.ensureUniqueUserName(userName);
    await this.ensureBuildingFlat(dto.buildingId, dto.flatId);

    const passwordHash = await hashPassword(dto.password);

    const created = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          role: UserRole.User,
          userName,
          fullName,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          passwordHash,
        })
        .returning();

      await tx.insert(schema.standardUserProfiles).values({
        userId: user.id,
        buildingId: dto.buildingId,
        flatId: dto.flatId,
        gasMeterNo,
        installationDate: dto.installationDate?.trim() || null,
        activationDate: dto.activationDate?.trim() || null,
      });

      return user;
    });

    return this.getStandardUser(created.id);
  }

  async updateStandardUser(id: number, dto: UpdateStandardUserDto) {
    const existing = await this.getStandardUser(id);
    const patch: Partial<typeof schema.users.$inferInsert> = {};

    if (dto.userName !== undefined) {
      const userName = this.requireText(dto.userName, 'userName');
      if (userName !== existing.userName)
        await this.ensureUniqueUserName(userName);
      patch.userName = userName;
    }
    if (dto.fullName !== undefined)
      patch.fullName = this.requireText(dto.fullName, 'fullName');
    if (dto.phone !== undefined) patch.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) patch.email = dto.email?.trim() || null;
    if (dto.password !== undefined) {
      if (dto.password.length < 8) {
        throw new BadRequestException('password must be at least 8 characters');
      }
      patch.passwordHash = await hashPassword(dto.password);
    }

    const profilePatch: Partial<
      typeof schema.standardUserProfiles.$inferInsert
    > = {};
    const nextBuildingId = dto.buildingId ?? existing.profile?.buildingId;
    const nextFlatId = dto.flatId ?? existing.profile?.flatId;
    if (nextBuildingId && nextFlatId)
      await this.ensureBuildingFlat(nextBuildingId, nextFlatId);

    if (dto.buildingId !== undefined) profilePatch.buildingId = dto.buildingId;
    if (dto.flatId !== undefined) profilePatch.flatId = dto.flatId;
    if (dto.gasMeterNo !== undefined)
      profilePatch.gasMeterNo = this.requireText(dto.gasMeterNo, 'gasMeterNo');
    if (dto.installationDate !== undefined)
      profilePatch.installationDate = dto.installationDate?.trim() || null;
    if (dto.activationDate !== undefined)
      profilePatch.activationDate = dto.activationDate?.trim() || null;

    await this.db.transaction(async (tx) => {
      if (Object.keys(patch).length > 0) {
        await tx.update(schema.users).set(patch).where(eq(schema.users.id, id));
      }
      if (Object.keys(profilePatch).length > 0) {
        await tx
          .update(schema.standardUserProfiles)
          .set(profilePatch)
          .where(eq(schema.standardUserProfiles.userId, id));
      }
    });

    return this.getStandardUser(id);
  }

  async deleteStandardUser(id: number) {
    await this.getStandardUser(id);
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
    return { deleted: true };
  }

  async listStaff() {
    const users = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, UserRole.Staff))
      .orderBy(schema.users.id);
    if (users.length === 0) return [];

    const profiles = await this.db
      .select()
      .from(schema.staffProfiles)
      .where(
        inArray(
          schema.staffProfiles.userId,
          users.map((u) => u.id),
        ),
      );
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    return users.map((u) => ({ ...u, profile: profileMap.get(u.id) ?? null }));
  }

  async getStaff(id: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(eq(schema.users.id, id), eq(schema.users.role, UserRole.Staff)),
      )
      .limit(1);
    if (!user) throw new NotFoundException('Staff not found');

    const [profile] = await this.db
      .select()
      .from(schema.staffProfiles)
      .where(eq(schema.staffProfiles.userId, id))
      .limit(1);

    return { ...user, profile: profile ?? null };
  }

  async createStaff(dto: CreateStaffDto) {
    const userName = this.requireText(dto.userName, 'userName');
    const fullName = this.requireText(dto.fullName, 'fullName');
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }
    await this.ensureUniqueUserName(userName);

    const passwordHash = await hashPassword(dto.password);

    const created = await this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(schema.users)
        .values({
          role: UserRole.Staff,
          userName,
          fullName,
          phone: dto.phone?.trim() || null,
          email: dto.email?.trim() || null,
          passwordHash,
        })
        .returning();

      await tx.insert(schema.staffProfiles).values({
        userId: user.id,
        address: dto.address?.trim() || null,
        operationArea: dto.operationArea?.trim() || null,
      });

      return user;
    });

    return this.getStaff(created.id);
  }

  async updateStaff(id: number, dto: UpdateStaffDto) {
    const existing = await this.getStaff(id);
    const patch: Partial<typeof schema.users.$inferInsert> = {};
    if (dto.userName !== undefined) {
      const userName = this.requireText(dto.userName, 'userName');
      if (userName !== existing.userName)
        await this.ensureUniqueUserName(userName);
      patch.userName = userName;
    }
    if (dto.fullName !== undefined)
      patch.fullName = this.requireText(dto.fullName, 'fullName');
    if (dto.phone !== undefined) patch.phone = dto.phone?.trim() || null;
    if (dto.email !== undefined) patch.email = dto.email?.trim() || null;
    if (dto.password !== undefined) {
      if (dto.password.length < 8) {
        throw new BadRequestException('password must be at least 8 characters');
      }
      patch.passwordHash = await hashPassword(dto.password);
    }

    const profilePatch: Partial<typeof schema.staffProfiles.$inferInsert> = {};
    if (dto.address !== undefined)
      profilePatch.address = dto.address?.trim() || null;
    if (dto.operationArea !== undefined)
      profilePatch.operationArea = dto.operationArea?.trim() || null;

    await this.db.transaction(async (tx) => {
      if (Object.keys(patch).length > 0) {
        await tx.update(schema.users).set(patch).where(eq(schema.users.id, id));
      }
      if (Object.keys(profilePatch).length > 0) {
        await tx
          .update(schema.staffProfiles)
          .set(profilePatch)
          .where(eq(schema.staffProfiles.userId, id));
      }
    });

    return this.getStaff(id);
  }

  async deleteStaff(id: number) {
    await this.getStaff(id);
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
    return { deleted: true };
  }

  async getSystemConfig(buildingId: number) {
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Building is required');
    }
    await this.loadsService.assertBuilding(buildingId);
    const [row] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.buildingId, buildingId))
      .limit(1);
    const gasUnitPrice =
      await this.loadsService.applyGasPriceToSystemConfig(buildingId);
    if (!row) {
      return {
        id: 0,
        buildingId,
        gasUnitName: 'm3',
        gasUnitPrice: gasUnitPrice.toFixed(2),
        operatingCostPerFlat: '1.00',
      };
    }
    return { ...row, gasUnitPrice: gasUnitPrice.toFixed(2) };
  }

  async createSystemConfig(dto: SystemConfigDto) {
    const buildingId = this.requireBuildingId(dto.buildingId);
    await this.loadsService.assertBuilding(buildingId);
    this.requireText(dto.gasUnitName, 'gasUnitName');
    const operatingCostPerFlat = this.resolveOperatingCostPerFlat(dto);
    const gasUnitPrice =
      await this.loadsService.resolveGasPricePerKg(buildingId);
    const [row] = await this.db
      .insert(schema.systemConfigs)
      .values({
        buildingId,
        gasUnitName: dto.gasUnitName.trim(),
        gasUnitPrice: gasUnitPrice.toFixed(2),
        operatingCostPerFlat: operatingCostPerFlat.toFixed(2),
      })
      .returning();
    return row;
  }

  async updateSystemConfig(dto: SystemConfigDto) {
    const buildingId = this.requireBuildingId(dto.buildingId);
    await this.loadsService.assertBuilding(buildingId);
    this.requireText(dto.gasUnitName, 'gasUnitName');
    const operatingCostPerFlat = this.resolveOperatingCostPerFlat(dto);
    const gasUnitPrice =
      await this.loadsService.resolveGasPricePerKg(buildingId);

    const [current] = await this.db
      .select()
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.buildingId, buildingId))
      .limit(1);

    if (!current) return this.createSystemConfig(dto);

    const [row] = await this.db
      .update(schema.systemConfigs)
      .set({
        gasUnitName: dto.gasUnitName.trim(),
        gasUnitPrice: gasUnitPrice.toFixed(2),
        operatingCostPerFlat: operatingCostPerFlat.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(schema.systemConfigs.id, current.id))
      .returning();
    return row;
  }

  private resolveOperatingCostPerFlat(dto: SystemConfigDto): number {
    if (dto.operatingCostPerFlat === undefined) {
      return 1;
    }
    if (
      !Number.isFinite(dto.operatingCostPerFlat) ||
      dto.operatingCostPerFlat < 0
    ) {
      throw new BadRequestException(
        'operatingCostPerFlat must be a non-negative number',
      );
    }
    return dto.operatingCostPerFlat;
  }

  async deleteSystemConfig(buildingId: number) {
    const [current] = await this.db
      .select({ id: schema.systemConfigs.id })
      .from(schema.systemConfigs)
      .where(eq(schema.systemConfigs.buildingId, buildingId))
      .limit(1);
    if (!current) throw new NotFoundException('System config not found');
    await this.db
      .delete(schema.systemConfigs)
      .where(eq(schema.systemConfigs.id, current.id));
    return { deleted: true };
  }

  private requireBuildingId(value: number): number {
    if (!Number.isFinite(value) || value < 1) {
      throw new BadRequestException('Building is required');
    }
    return Math.trunc(value);
  }

  private requireText(value: string, field: string): string {
    if (!value || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }
    return value.trim();
  }

  private async ensureUniqueUserName(userName: string) {
    const [exists] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.userName, userName))
      .limit(1);
    if (exists) throw new ConflictException('Username is already taken');
  }

  private async ensureBuildingFlat(buildingId: number, flatId: number) {
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Invalid buildingId');
    }
    if (!Number.isFinite(flatId) || flatId < 1) {
      throw new BadRequestException('Invalid flatId');
    }

    const [building] = await this.db
      .select({ id: schema.buildings.id })
      .from(schema.buildings)
      .where(eq(schema.buildings.id, buildingId))
      .limit(1);
    if (!building) throw new BadRequestException('Building not found');

    const [flat] = await this.db
      .select({ id: schema.flats.id })
      .from(schema.flats)
      .where(
        and(
          eq(schema.flats.id, flatId),
          eq(schema.flats.buildingId, buildingId),
        ),
      )
      .limit(1);
    if (!flat)
      throw new BadRequestException(
        'Flat does not belong to selected building',
      );
  }

  private async ensureBuildingExists(buildingId: number) {
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Invalid buildingId');
    }
    const [building] = await this.db
      .select({ id: schema.buildings.id })
      .from(schema.buildings)
      .where(eq(schema.buildings.id, buildingId))
      .limit(1);
    if (!building) throw new BadRequestException('Building not found');
  }
}
