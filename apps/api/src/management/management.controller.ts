import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const buildings = [
  {
    id: 1,
    name: 'Green Tower',
    address1: '12 Lake View',
    address2: 'Gulshan',
    postCode: '1212',
  },
];

const flats = [
  { id: 1, buildingId: 1, flatNo: 'A-1' },
  { id: 2, buildingId: 1, flatNo: 'A-2' },
];

@Controller('management')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ManagementController {
  @Get('buildings')
  @Roles(UserRole.Admin, UserRole.Staff)
  getBuildings() {
    return buildings;
  }

  @Get('buildings/:id/flats')
  @Roles(UserRole.Admin, UserRole.Staff)
  getBuildingFlats(@Param('id') id: string) {
    const buildingId = Number(id);
    return flats.filter((item) => item.buildingId === buildingId);
  }

  @Get('buildings/:id/address')
  @Roles(UserRole.Admin)
  getBuildingAddress(@Param('id') id: string) {
    return buildings.find((item) => item.id === Number(id)) ?? null;
  }
}
