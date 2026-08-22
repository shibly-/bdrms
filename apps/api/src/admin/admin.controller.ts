import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ADMIN_PORTAL_ROLES } from '../common/admin-roles';
import { UserRole } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  @Roles(...ADMIN_PORTAL_ROLES)
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('buildings')
  @Roles(...ADMIN_PORTAL_ROLES)
  listBuildings() {
    return this.adminService.listBuildings();
  }

  @Get('buildings/:id')
  @Roles(UserRole.Admin)
  getBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getBuilding(id);
  }

  @Post('buildings')
  @Roles(UserRole.Admin)
  createBuilding(
    @Body()
    body: {
      name: string;
      buildingNo?: string;
      address1: string;
      address2: string;
      postCode: string;
    },
  ) {
    return this.adminService.createBuilding(body);
  }

  @Patch('buildings/:id')
  @Roles(UserRole.Admin)
  updateBuilding(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      buildingNo?: string;
      address1?: string;
      address2?: string;
      postCode?: string;
    },
  ) {
    return this.adminService.updateBuilding(id, body);
  }

  @Delete('buildings/:id')
  @Roles(UserRole.Admin)
  deleteBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteBuilding(id);
  }

  @Get('flats')
  @Roles(...ADMIN_PORTAL_ROLES)
  listFlats() {
    return this.adminService.listFlats();
  }

  @Get('flats/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  getFlat(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getFlat(id);
  }

  @Post('flats')
  @Roles(...ADMIN_PORTAL_ROLES)
  createFlat(
    @Body()
    body: {
      flatNo: string;
      buildingId: number;
    },
  ) {
    return this.adminService.createFlat(body);
  }

  @Patch('flats/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  updateFlat(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      flatNo?: string;
      buildingId?: number;
    },
  ) {
    return this.adminService.updateFlat(id, body);
  }

  @Delete('flats/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  deleteFlat(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteFlat(id);
  }

  @Get('users')
  @Roles(...ADMIN_PORTAL_ROLES)
  listStandardUsers() {
    return this.adminService.listStandardUsers();
  }

  @Get('users/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  getStandardUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getStandardUser(id);
  }

  @Post('staff')
  @Roles(...ADMIN_PORTAL_ROLES)
  createStaff(
    @Body()
    body: {
      userName: string;
      password: string;
      fullName: string;
      phone?: string;
      email?: string;
      address?: string;
      operationArea?: string;
    },
  ) {
    return this.adminService.createStaff(body);
  }

  @Get('staff')
  @Roles(...ADMIN_PORTAL_ROLES)
  listStaff() {
    return this.adminService.listStaff();
  }

  @Get('staff/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  getStaff(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getStaff(id);
  }

  @Patch('staff/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  updateStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      userName?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
      operationArea?: string;
    },
  ) {
    return this.adminService.updateStaff(id, body);
  }

  @Delete('staff/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  deleteStaff(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteStaff(id);
  }

  @Post('users')
  @Roles(...ADMIN_PORTAL_ROLES)
  createStandardUser(
    @Body()
    body: {
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
    },
  ) {
    return this.adminService.createStandardUser(body);
  }

  @Patch('users/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  updateStandardUser(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      userName?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      email?: string;
      buildingId?: number;
      flatId?: number;
      gasMeterNo?: string;
      installationDate?: string;
      activationDate?: string;
    },
  ) {
    return this.adminService.updateStandardUser(id, body);
  }

  @Delete('users/:id')
  @Roles(...ADMIN_PORTAL_ROLES)
  deleteStandardUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteStandardUser(id);
  }

  @Get('system-config')
  @Roles(UserRole.Admin)
  getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Post('system-config')
  @Roles(UserRole.Admin)
  createSystemConfig(
    @Body()
    body: {
      gasUnitName: string;
      gasUnitPrice: number;
      operatingCostPerFlat?: number;
    },
  ) {
    return this.adminService.createSystemConfig(body);
  }

  @Patch('system-config')
  @Roles(UserRole.Admin)
  updateSystemConfig(
    @Body()
    body: {
      gasUnitName: string;
      gasUnitPrice: number;
      operatingCostPerFlat?: number;
    },
  ) {
    return this.adminService.updateSystemConfig(body);
  }

  @Delete('system-config')
  @Roles(UserRole.Admin)
  deleteSystemConfig() {
    return this.adminService.deleteSystemConfig();
  }
}
