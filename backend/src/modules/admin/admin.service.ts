import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

import { CreateStaffUserDto, StaffUserDto, UpdateStaffPermissionsDto } from './dto/staff.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';

const STAFF_USER_INCLUDE = {
  roles: {
    include: {
      role: true,
    },
  },
  deliveryAgent: true,
} satisfies Prisma.UserInclude;

type StaffUserRecord = Prisma.UserGetPayload<{ include: typeof STAFF_USER_INCLUDE }>;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(): Promise<DashboardResponseDto> {
    const [totalOrders, totalUsers, totalRestaurants, payments] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.restaurant.count(),
      this.prisma.payment.findMany(),
    ]);

    return {
      totalOrders,
      totalUsers,
      totalRestaurants,
      totalRevenue: payments.reduce(
        (sum: number, payment: { amount: number }) => sum + payment.amount,
        0,
      ),
    };
  }

  async listStaff(): Promise<StaffUserDto[]> {
    const staff = await this.prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: {
              name: {
                in: [Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY],
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: STAFF_USER_INCLUDE,
    });

    return staff.map((user) => this.mapStaffUser(user));
  }

  async createStaff(payload: CreateStaffUserDto): Promise<StaffUserDto> {
    if (![Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY].includes(payload.role)) {
      throw new BadRequestException('Only admin, manager, and delivery boy staff can be created');
    }

    const email = payload.email?.trim().toLowerCase() || null;
    const phone = payload.phone?.trim() || null;
    const name = payload.name?.trim() || null;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    if (payload.role === Role.DELIVERY_BOY && !phone) {
      throw new BadRequestException('Phone is required when creating a delivery boy');
    }

    const password = await hash(payload.password, 10);

    const user = await this.prisma.$transaction(async (transaction) => {
      const role = await transaction.roleMaster.findUnique({
        where: { name: payload.role },
      });

      if (!role) {
        throw new BadRequestException(`${payload.role} role is not configured`);
      }

      const conflicts: Prisma.UserWhereInput[] = [];
      if (email) conflicts.push({ email });
      if (phone) conflicts.push({ phone });

      const existingUser = await transaction.user.findFirst({
        where: { OR: conflicts },
      });

      if (existingUser) {
        throw new BadRequestException('Email or phone is already in use');
      }

      const created = await transaction.user.create({
        data: {
          name,
          email,
          phone,
          password,
          roles: {
            create: [{ roleId: role.id }],
          },
        },
        include: STAFF_USER_INCLUDE,
      });

      if (payload.role === Role.DELIVERY_BOY) {
        await transaction.deliveryAgent.create({
          data: {
            userId: created.id,
            name: name ?? email ?? phone!,
            phone: phone!,
          },
        });
      }

      const createdWithAgent = await transaction.user.findUnique({
        where: { id: created.id },
        include: STAFF_USER_INCLUDE,
      });

      if (!createdWithAgent) {
        throw new BadRequestException('Unable to create staff user');
      }

      return createdWithAgent;
    });

    return this.mapStaffUser(user, payload.permissions);
  }

  async updateStaffPermissions(
    id: number,
    payload: UpdateStaffPermissionsDto,
  ): Promise<StaffUserDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        email: payload.email.trim().toLowerCase(),
      },
      include: STAFF_USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    return this.mapStaffUser(user, payload.permissions);
  }

  private mapStaffUser(
    user: StaffUserRecord,
    permissions?: Record<string, string[]>,
  ): StaffUserDto {
    const roles = user.roles.map((entry) => entry.role.name as Role);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      roles,
      permissions: permissions ?? this.getDefaultPermissions(roles),
      deliveryAgent: user.deliveryAgent
        ? {
            id: user.deliveryAgent.id,
            name: user.deliveryAgent.name,
            phone: user.deliveryAgent.phone,
            isAvailable: user.deliveryAgent.isAvailable,
          }
        : null,
    };
  }

  private getDefaultPermissions(roles: Role[]): Record<string, string[]> {
    if (roles.includes(Role.ADMIN)) {
      return {
        dashboard: ['view'],
        orders: ['view', 'accept', 'reject', 'complete'],
        restaurants: ['view', 'create', 'edit', 'delete'],
        categories: ['view', 'create', 'edit', 'delete'],
        coupons: ['view', 'create', 'edit', 'delete'],
        customers: ['view'],
        payments: ['view', 'filter'],
        staff: ['view', 'create', 'edit', 'assign'],
      };
    }

    if (roles.includes(Role.MANAGER)) {
      return {
        dashboard: ['view'],
        orders: ['view', 'accept', 'reject'],
        restaurants: ['view', 'edit'],
        categories: ['view'],
        coupons: ['view', 'create', 'edit'],
        customers: ['view'],
        payments: ['view', 'filter'],
        staff: [],
      };
    }

    return {
      deliveries: ['view'],
    };
  }
}
