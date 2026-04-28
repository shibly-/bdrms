import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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

  @Get('monthly')
  @Roles(UserRole.Admin, UserRole.Staff)
  getMonthly(@Query('month') month?: string) {
    const now = new Date();
    return {
      month:
        month ??
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      items: [],
    };
  }
}
