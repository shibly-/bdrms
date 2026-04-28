import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '../common/types';

type LoginDto = {
  userName: string;
  password: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(dto: LoginDto) {
    if (!dto.userName || !dto.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Placeholder authentication. Replace with user lookup + password hash verify.
    const role = this.resolveDemoRole(dto.userName);
    const payload = { sub: 1, userName: dto.userName, role };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      role,
    };
  }

  private resolveDemoRole(userName: string): UserRole {
    if (userName.startsWith('admin')) return UserRole.Admin;
    if (userName.startsWith('staff')) return UserRole.Staff;
    return UserRole.User;
  }
}
