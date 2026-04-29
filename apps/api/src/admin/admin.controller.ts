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
import { UserRole } from '../common/types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('buildings')
  listBuildings() {
    return this.adminService.listBuildings();
  }

  @Get('buildings/:id')
  getBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getBuilding(id);
  }

  @Post('buildings')
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
  deleteBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteBuilding(id);
  }

  @Get('flats')
  listFlats() {
    return this.adminService.listFlats();
  }

  @Get('flats/:id')
  getFlat(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getFlat(id);
  }

  @Post('flats')
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
  deleteFlat(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteFlat(id);
  }

  @Get('users')
  listStandardUsers() {
    return this.adminService.listStandardUsers();
  }

  @Get('users/:id')
  getStandardUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getStandardUser(id);
  }

  @Post('staff')
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
  listStaff() {
    return this.adminService.listStaff();
  }

  @Get('staff/:id')
  getStaff(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getStaff(id);
  }

  @Patch('staff/:id')
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
  deleteStaff(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteStaff(id);
  }

  @Post('users')
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
  deleteStandardUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteStandardUser(id);
  }

  @Get('system-config')
  getSystemConfig() {
    return this.adminService.getSystemConfig();
  }

  @Post('system-config')
  createSystemConfig(
    @Body() body: { gasUnitName: string; gasUnitPrice: number },
  ) {
    return this.adminService.createSystemConfig(body);
  }

  @Patch('system-config')
  updateSystemConfig(
    @Body() body: { gasUnitName: string; gasUnitPrice: number },
  ) {
    return this.adminService.updateSystemConfig(body);
  }

  @Delete('system-config')
  deleteSystemConfig() {
    return this.adminService.deleteSystemConfig();
  }
}
