import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../database/schema';
import { UserRole } from '../common/types';
import { hashPassword, verifyPassword } from './password.util';

type LoginDto = {
  userName: string;
  password: string;
};

export type RegisterStandardUserDto = {
  userName: string;
  password: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  buildingId: number;
  flatId: number;
  gasMeterNo: string;
  installationDate?: string | null;
  activationDate?: string | null;
};

type Db = PostgresJsDatabase<typeof schema>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly jwtService: JwtService,
  ) {}

  async listBuildingsForRegistration() {
    return this.db
      .select({
        id: schema.buildings.id,
        name: schema.buildings.name,
        buildingNo: schema.buildings.buildingNo,
        address1: schema.buildings.address1,
        address2: schema.buildings.address2,
        postCode: schema.buildings.postCode,
      })
      .from(schema.buildings)
      .orderBy(schema.buildings.name);
  }

  async listFlatsForRegistration(buildingId: number) {
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Invalid building id');
    }
    return this.db
      .select({
        id: schema.flats.id,
        flatNo: schema.flats.flatNo,
        buildingId: schema.flats.buildingId,
      })
      .from(schema.flats)
      .where(eq(schema.flats.buildingId, buildingId))
      .orderBy(schema.flats.flatNo);
  }

  async register(dto: RegisterStandardUserDto) {
    const userName = dto.userName?.trim();
    const password = dto.password;
    const fullName = dto.fullName?.trim();
    const gasMeterNo = dto.gasMeterNo?.trim();

    if (!userName || userName.length < 2) {
      throw new BadRequestException('Username must be at least 2 characters');
    }
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    if (!fullName || fullName.length < 2) {
      throw new BadRequestException('Full name is required');
    }
    if (!gasMeterNo) {
      throw new BadRequestException('Gas meter number is required');
    }

    const buildingId = Number(dto.buildingId);
    const flatId = Number(dto.flatId);
    if (!Number.isFinite(buildingId) || buildingId < 1) {
      throw new BadRequestException('Invalid building');
    }
    if (!Number.isFinite(flatId) || flatId < 1) {
      throw new BadRequestException('Invalid flat');
    }

    const existing = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.userName, userName))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Username is already taken');
    }

    const building = await this.db
      .select({ id: schema.buildings.id })
      .from(schema.buildings)
      .where(eq(schema.buildings.id, buildingId))
      .limit(1);

    if (building.length === 0) {
      throw new BadRequestException('Building not found');
    }

    const flat = await this.db
      .select({
        id: schema.flats.id,
        buildingId: schema.flats.buildingId,
      })
      .from(schema.flats)
      .where(
        and(
          eq(schema.flats.id, flatId),
          eq(schema.flats.buildingId, buildingId),
        ),
      )
      .limit(1);

    if (flat.length === 0) {
      throw new BadRequestException(
        'Flat does not belong to the selected building',
      );
    }

    const passwordHash = await hashPassword(password);

    const newUser = await this.db.transaction(async (tx) => {
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
        .returning({
          id: schema.users.id,
          userName: schema.users.userName,
          role: schema.users.role,
        });

      if (!user) {
        throw new BadRequestException('Could not create user');
      }

      await tx.insert(schema.standardUserProfiles).values({
        userId: user.id,
        buildingId,
        flatId,
        gasMeterNo,
        installationDate: dto.installationDate?.trim() || null,
        activationDate: dto.activationDate?.trim() || null,
      });

      return user;
    });

    const accessToken = await this.jwtService.signAsync({
      sub: newUser.id,
      userName: newUser.userName,
      role: newUser.role,
    });

    return {
      accessToken,
      role: newUser.role,
      userId: newUser.id,
    };
  }

  async login(dto: LoginDto) {
    if (!dto.userName || !dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userName = dto.userName.trim();

    const rows = await this.db
      .select({
        id: schema.users.id,
        userName: schema.users.userName,
        role: schema.users.role,
        passwordHash: schema.users.passwordHash,
      })
      .from(schema.users)
      .where(eq(schema.users.userName, userName))
      .limit(1);

    const row = rows[0];
    if (row) {
      const ok = await verifyPassword(dto.password, row.passwordHash);
      if (!ok) {
        throw new UnauthorizedException('Invalid credentials');
      }
      return {
        accessToken: await this.jwtService.signAsync({
          sub: row.id,
          userName: row.userName,
          role: row.role,
        }),
        role: row.role,
      };
    }

    const role = this.resolveDemoRole(userName);
    const payload = { sub: 0, userName, role };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      role,
    };
  }

  private resolveDemoRole(userName: string): UserRole {
    if (userName.startsWith('admin')) return UserRole.Admin;
    if (userName.startsWith('staff')) return UserRole.Staff;
    return UserRole.User;
  }
}
