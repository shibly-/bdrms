import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
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
  @Roles(UserRole.Admin, UserRole.Staff)
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
  @Roles(UserRole.Admin, UserRole.Staff)
  extractReading(@Body() body: { imageUrl: string }) {
    const ocrReading = this.billingService.extractReadingFromImage(
      body.imageUrl,
    );
    return { ocrReading };
  }

  @Get('flat-context')
  @Roles(UserRole.Admin, UserRole.Staff)
  getFlatContext(@Query('flatId') flatId?: string) {
    return this.billingService.getFlatBillingContext(Number(flatId));
  }

  @Post('generate')
  @Roles(UserRole.Admin, UserRole.Staff)
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

  @Get('monthly')
  @Roles(UserRole.Admin, UserRole.Staff)
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

  @Get('history')
  @Roles(UserRole.Admin, UserRole.Staff)
  getHistory(
    @Query('month') month?: string,
    @Query('userName') userName?: string,
    @Query('gasMeterNo') gasMeterNo?: string,
    @Query('buildingId') buildingId?: string,
    @Query('flatId') flatId?: string,
  ) {
    return this.billingService.listBillingHistory({
      month,
      userName,
      gasMeterNo,
      buildingId: buildingId ? Number(buildingId) : undefined,
      flatId: flatId ? Number(flatId) : undefined,
    });
  }
}
