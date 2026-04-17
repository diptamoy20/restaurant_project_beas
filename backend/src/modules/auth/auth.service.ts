import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';

import { AuthenticatedUser, JwtPayload } from './auth.types';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaUserWithRoles = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  password?: string;
  isActive?: boolean;
  roles: { role: { name: string } }[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponseDto> {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const conditions = [];
    if (payload.email) conditions.push({ email: payload.email });
    if (payload.phone) conditions.push({ phone: payload.phone });

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: conditions },
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

  async login(payload: LoginDto): Promise<AuthResponseDto> {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const conditions = [];
    if (payload.email) conditions.push({ email: payload.email });
    if (payload.phone) conditions.push({ phone: payload.phone });

    const user = await this.prisma.user.findFirst({
      where: {
        OR: conditions,
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
      roles: this.mapRoles(user),
    };
  }

  private buildAuthResponse(user: PrismaUserWithRoles): AuthResponseDto {
    const roles = this.mapRoles(user);

    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      roles,
    };

    return {
      accessToken: this.jwtService.sign(jwtPayload, {
        expiresIn: '7d',
      }),
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

  private mapRoles(user: PrismaUserWithRoles): Role[] {
    return user.roles.map((entry) => entry.role.name as Role);
  }
}
