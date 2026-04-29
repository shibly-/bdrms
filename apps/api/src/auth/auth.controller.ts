import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { AuthService, type RegisterStandardUserDto } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
