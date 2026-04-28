import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminController {
  @Post('staff')
  createStaff(@Body() body: Record<string, unknown>) {
    return { message: 'Admin-only staff creation endpoint', payload: body };
  }

  @Post('users')
  createStandardUser(@Body() body: Record<string, unknown>) {
    return {
      message: 'Admin-only standard user creation endpoint',
      payload: body,
    };
  }

  @Patch('system-config')
  updateSystemConfig(
    @Body() body: { gasUnitName: string; gasUnitPrice: number },
  ) {
    return {
      message: 'Admin-only system config update endpoint',
      payload: body,
    };
  }
}
