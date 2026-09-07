import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ADMIN_STAFF_ROLES,
  ADMIN_STAFF_USER_ROLES,
} from '../common/admin-roles';
import { UserRole } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BillingService } from './billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('calculate')
  @Roles(...ADMIN_STAFF_ROLES)
  calculate(
    @Body()
    body: {
      previousReading?: number | null;
      currentReading: number;
      unitPrice: number;
    },
  ) {
    return this.billingService.calculate(body);
  }

  @Post('ocr')
  @Roles(...ADMIN_STAFF_ROLES)
  extractReading(@Body() body: { imageUrl: string }) {
    const ocrReading = this.billingService.extractReadingFromImage(
      body.imageUrl,
    );
    return { ocrReading };
  }

  @Get('flat-context')
  @Roles(...ADMIN_STAFF_ROLES)
  getFlatContext(@Query('flatId') flatId?: string) {
    return this.billingService.getFlatBillingContext(Number(flatId));
  }

  @Get('building-context')
  @Roles(...ADMIN_STAFF_ROLES)
  getBuildingContext(@Query('buildingId') buildingId?: string) {
    return this.billingService.getBuildingBillingContext(Number(buildingId));
  }

  @Post('generate-building')
  @Roles(...ADMIN_STAFF_ROLES)
  generateForBuilding(
    @Req() req: { user?: { sub?: number } },
    @Body()
    body: {
      buildingId: number;
      items: { flatId: number; currentReading: number }[];
    },
  ) {
    return this.billingService.createGasBillsForBuilding({
      buildingId: body.buildingId,
      items: body.items,
      createdByUserId: req.user?.sub ?? null,
    });
  }

  @Post('generate')
  @Roles(...ADMIN_STAFF_ROLES)
  generate(
    @Req() req: { user?: { sub?: number } },
    @Body()
    body: {
      flatId: number;
      currentReading: number;
      billingDate: string;
      ocrImageUrl?: string;
    },
  ) {
    return this.billingService.createGasBill({
      ...body,
      createdByUserId: req.user?.sub ?? null,
    });
  }

  @Get('unit-config')
  @Roles(...ADMIN_STAFF_USER_ROLES)
  async getUnitConfig(
    @Query('buildingId') buildingId?: string,
    @Req() req?: { user?: { sub?: number; userName?: string; role?: string } },
  ) {
    const parsed = Number(buildingId);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return this.billingService.getCurrentUnitConfig(parsed);
    }
    if (req?.user?.role === UserRole.User) {
      const scope = await this.billingService.resolveResidentUsageScope(
        req.user.sub,
        req.user.userName,
      );
      return this.billingService.getCurrentUnitConfig(scope.buildingId);
    }
    return {
      gasUnitName: 'Gas Unit',
      gasUnitPrice: 0,
      operatingCostPerFlat: 0,
    };
  }

  @Get('monthly')
  @Roles(...ADMIN_STAFF_ROLES)
  async getMonthly(@Query('month') month?: string) {
    const now = new Date();
    const targetMonth =
      month ??
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const history = await this.billingService.listBillingHistory({
      month: targetMonth,
    });
    return { month: targetMonth, ...history };
  }

  @Get('usage')
  @Roles(...ADMIN_STAFF_USER_ROLES)
  async getUsage(
    @Req()
    req: { user?: { role?: UserRole; sub?: number; userName?: string } },
    @Query('buildingId') buildingId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('granularity') granularity?: string,
  ) {
    const isResident = req.user?.role === UserRole.User;
    const scope = isResident
      ? await this.billingService.resolveResidentUsageScope(
          req.user?.sub,
          req.user?.userName,
        )
      : {
          buildingId: Number(buildingId),
          flatId: undefined as number | undefined,
        };
    return this.billingService.getUsageChart({
      buildingId: scope.buildingId,
      flatId: scope.flatId,
      startDate: startDate ?? '',
      endDate: endDate ?? '',
      granularity: granularity === 'weekly' ? 'weekly' : 'monthly',
    });
  }

  @Get('history')
  @Roles(...ADMIN_STAFF_USER_ROLES)
  getHistory(
    @Req()
    req: { user?: { role?: UserRole; userName?: string } },
    @Query('month') month?: string,
    @Query('userName') userName?: string,
    @Query('gasMeterNo') gasMeterNo?: string,
    @Query('buildingId') buildingId?: string,
    @Query('flatId') flatId?: string,
    @Query('status') status?: string,
  ) {
    const isResident = req.user?.role === UserRole.User;
    const scopedUserName = isResident ? req.user?.userName : userName;
    const allowed = ['unpaid', 'paid', 'cancelled'] as const;
    const statuses = status
      ? (status
          .split(',')
          .map((s) => s.trim())
          .filter((s): s is (typeof allowed)[number] =>
            (allowed as readonly string[]).includes(s),
          ) as ('unpaid' | 'paid' | 'cancelled')[])
      : undefined;
    return this.billingService.listBillingHistory({
      month,
      userName: scopedUserName,
      gasMeterNo,
      buildingId: buildingId ? Number(buildingId) : undefined,
      flatId: flatId ? Number(flatId) : undefined,
      statuses: statuses && statuses.length > 0 ? statuses : undefined,
    });
  }

  @Get('bill/:id')
  @Roles(...ADMIN_STAFF_ROLES)
  getBill(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.getBillById(id);
  }

  @Post(':id/mark-paid')
  @Roles(UserRole.Admin)
  markPaid(@Param('id', ParseIntPipe) id: number) {
    return this.billingService.markBillPaid(id);
  }

  @Post(':id/update')
  @Roles(UserRole.Admin)
  updateBill(
    @Req() req: { user?: { sub?: number } },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { currentReading: number; updateReason: string },
  ) {
    return this.billingService.updateUnpaidBill({
      billId: id,
      currentReading: body.currentReading,
      updateReason: body.updateReason,
      updatedByUserId: req.user?.sub ?? null,
    });
  }
}
