import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive user');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async seedSuperAdmin() {
    const adminCount = await this.prisma.user.count({
      where: { role: RoleType.SUPER_ADMIN },
    });

    if (adminCount > 0) {
      throw new BadRequestException('Super Admin already exists');
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await this.prisma.user.create({
      data: {
        email: 'admin@erp.com',
        name: 'System Super Admin',
        password: hashedPassword,
        role: RoleType.SUPER_ADMIN,
        isActive: true,
      },
    });

    return {
      message: 'Super admin user created successfully',
      email: user.email,
      password: 'admin123',
    };
  }
}
