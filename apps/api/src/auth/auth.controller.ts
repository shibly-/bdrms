import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '../common/types';
import { AuthService, type RegisterStandardUserDto } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.User)
  me(@Req() req: { user?: { sub?: number; userName?: string } }) {
    const userId = req.user?.sub;
    const userName = req.user?.userName;
    if ((userId == null || !Number.isFinite(userId)) && !userName) {
      throw new UnauthorizedException('Invalid session');
    }
    return this.authService.getResidentProfile(userId ?? 0, userName);
  }

  @Get('buildings')
  listBuildings() {
    return this.authService.listBuildingsForRegistration();
  }

  @Get('buildings/:buildingId/flats')
  listFlats(@Param('buildingId', ParseIntPipe) buildingId: number) {
    return this.authService.listFlatsForRegistration(buildingId);
  }

  @Post('register')
  register(@Body() body: RegisterStandardUserDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: { userName: string; password: string }) {
    return this.authService.login(body);
  }
}
