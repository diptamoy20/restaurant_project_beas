import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import { AuthenticatedUser, JwtPayload } from './auth.types';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto) {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          payload.email ? { email: payload.email } : undefined,
          payload.phone ? { phone: payload.phone } : undefined,
        ].filter(Boolean) as { email?: string; phone?: string }[],
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const customerRole = await this.prisma.roleMaster.findUnique({
      where: { name: Role.CUSTOMER },
    });

    if (!customerRole) {
      throw new BadRequestException('Customer role is not configured');
    }

    const password = await hash(payload.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password,
        roles: {
          create: [{ roleId: customerRole.id }],
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(payload: LoginDto) {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          payload.email ? { email: payload.email } : undefined,
          payload.phone ? { phone: payload.phone } : undefined,
        ].filter(Boolean) as { email?: string; phone?: string }[],
        isActive: true,
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(payload.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async validateUserById(id: number): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      roles: user.roles.map((entry: { role: { name: string } }) => entry.role.name as Role),
    };
  }

  private buildAuthResponse(user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    roles: { role: { name: string } }[];
  }) {
    const roles = user.roles.map((entry: { role: { name: string } }) => entry.role.name as Role);
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      roles,
    };

    return {
      accessToken: this.jwtService.sign(jwtPayload),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        roles,
      },
    };
  }
}
