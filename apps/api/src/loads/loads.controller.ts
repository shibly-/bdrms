import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_STAFF_ROLES } from '../common/admin-roles';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { LoadsService, parseBuildingId } from './loads.service';

@Controller('loads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ADMIN_STAFF_ROLES)
export class LoadsController {
  constructor(private readonly loadsService: LoadsService) {}

  @Get('current')
  getCurrent(@Query('buildingId') buildingId?: string) {
    return this.loadsService.getCurrent(parseBuildingId(buildingId));
  }

  @Get('history')
  getHistory(@Query('buildingId') buildingId?: string) {
    const id =
      buildingId != null && String(buildingId).length > 0
        ? parseBuildingId(buildingId)
        : undefined;
    return this.loadsService.listHistory(id);
  }

  @Post('update')
  update(
    @Req() req: { user?: { sub?: number } },
    @Body()
    body: { buildingId?: number; quantityKg?: number; costBdt?: number },
  ) {
    return this.loadsService.updateCurrent({
      buildingId: body.buildingId,
      quantityKg: body.quantityKg,
      costBdt: body.costBdt,
      createdByUserId: req.user?.sub ?? null,
    });
  }

  @Post('consumed')
  markConsumed(@Body() body: { buildingId?: number }) {
    return this.loadsService.markConsumed(parseBuildingId(body.buildingId));
  }
}
