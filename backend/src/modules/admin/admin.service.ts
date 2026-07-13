import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';

import {
  DashboardOverviewQueryDto,
  DashboardOverviewResponseDto,
  DashboardRange,
} from './dto/dashboard-overview.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import {
  CreateStaffUserDto,
  StaffUserDto,
  UpdateStaffPasswordDto,
  UpdateStaffPermissionsDto,
  UpdateStaffStatusDto,
  UpdateStaffUserDto,
} from './dto/staff.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CloudinaryImageUploadResult } from '../../common/cloudinary/cloudinary.types';
import {
  getDefaultPermissionsForRoles,
  PermissionMap,
} from '../../common/constants/default-permissions';
import { ORDER_STATUS } from '../../common/constants/order-status';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const STAFF_USER_INCLUDE = {
  role: {
    include: {
      role: true,
    },
  },
  deliveryAgent: true,
  restaurant: true,
} satisfies Prisma.UserInclude;

type StaffUserRecord = Prisma.UserGetPayload<{ include: typeof STAFF_USER_INCLUDE }>;
type DashboardOrderRecord = Prisma.OrderGetPayload<{
  include: {
    restaurant: true;
    user: true;
    delivery: true;
    items: {
      include: {
        menuItem: true;
      };
    };
  };
}>;

const COMPLETED_ORDER_STATUSES: string[] = [ORDER_STATUS.DELIVERED, ORDER_STATUS.SERVED];
const PENDING_ORDER_STATUSES: string[] = [ORDER_STATUS.PENDING, ORDER_STATUS.PLACED];
const REVENUE_EXCLUDED_STATUSES: string[] = [ORDER_STATUS.CANCELLED];
const DELIVERY_ATTENTION_STATUSES: string[] = [
  ORDER_STATUS.ACCEPTED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.ON_THE_WAY,
];

type DeliveryAgentProfileData = {
  isVerified?: boolean;
  address?: string | null;
  dateOfBirth?: Date | null;
  gender?: string | null;
  emergencyContact?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  vehicleBrand?: string | null;
  vehicleColor?: string | null;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getDashboard(): Promise<DashboardResponseDto> {
    const [totalOrders, totalUsers, totalRestaurants, paymentSummary] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.restaurant.count(),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalOrders,
      totalUsers,
      totalRestaurants,
      totalRevenue: this.roundMoney(paymentSummary._sum.amount ?? 0),
    };
  }

  async getDashboardOverview(
    query: DashboardOverviewQueryDto,
  ): Promise<DashboardOverviewResponseDto> {
    const range = query.range ?? 'today';
    const restaurantId = query.restaurantId ?? null;
    const window = this.getDashboardWindow(range);
    const restaurantFilter = restaurantId ? { restaurantId } : {};
    const orderWhere: Prisma.OrderWhereInput = {
      ...restaurantFilter,
      createdAt: {
        gte: window.start,
        lt: window.end,
      },
    };
    const restaurantWhere: Prisma.RestaurantWhereInput = {
      ...(restaurantId ? { id: restaurantId } : {}),
    };

    const [
      restaurantOptions,
      performanceRestaurants,
      activeRestaurants,
      availableDeliveryBoys,
      orders,
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
    ] = await Promise.all([
      this.prisma.restaurant.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.restaurant.findMany({
        where: restaurantWhere,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, isActive: true },
      }),
      this.prisma.restaurant.count({
        where: { ...restaurantWhere, isActive: true },
      }),
      this.prisma.deliveryAgent.count({
        where: {
          isAvailable: true,
          userId: { not: null },
          user: {
            isActive: true,
            role: {
              is: {
                role: {
                  name: Role.DELIVERY_BOY,
                },
              },
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          restaurant: true,
          user: true,
          delivery: true,
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where: orderWhere }),
      this.prisma.order.count({
        where: { ...orderWhere, status: { in: PENDING_ORDER_STATUSES } },
      }),
      this.prisma.order.count({
        where: { ...orderWhere, status: { in: COMPLETED_ORDER_STATUSES } },
      }),
      this.prisma.order.count({
        where: { ...orderWhere, status: ORDER_STATUS.CANCELLED },
      }),
    ]);

    const revenueOrders = orders.filter((order) => this.isRevenueOrder(order));
    const revenue = this.roundMoney(
      revenueOrders.reduce((sum, order) => sum + order.finalAmount, 0),
    );

    return {
      filters: {
        restaurantId,
        range,
      },
      kpis: {
        revenue,
        orders: totalOrders,
        averageOrderValue:
          revenueOrders.length > 0 ? this.roundMoney(revenue / revenueOrders.length) : 0,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        activeRestaurants,
        availableDeliveryBoys,
      },
      revenueTrend: this.buildRevenueTrend(revenueOrders, window),
      ordersTrend: this.buildOrdersTrend(orders, window),
      revenueByRestaurant: this.buildRevenueByRestaurant(revenueOrders),
      orderTypeSplit: this.buildOrderTypeSplit(orders),
      paymentMethodSplit: this.buildPaymentMethodSplit(revenueOrders),
      restaurantPerformance: this.buildRestaurantPerformance(performanceRestaurants, orders),
      ordersNeedingAttention: this.buildOrdersNeedingAttention(orders),
      topSellingItems: this.buildTopSellingItems(revenueOrders),
      restaurants: restaurantOptions.map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
      })),
    };
  }

  async listStaff(): Promise<StaffUserDto[]> {
    const staff = await this.prisma.user.findMany({
      where: {
        role: {
          is: {
            role: {
              name: {
                in: [Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY, Role.POS_STAFF],
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

  private getDashboardWindow(range: DashboardRange): {
    start: Date;
    end: Date;
    range: DashboardRange;
    labels: string[];
  } {
    const now = new Date();
    const end = new Date(now);

    end.setHours(24, 0, 0, 0);

    if (range === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);

      return {
        start,
        end,
        range,
        labels: Array.from({ length: 24 }, (_value, hour) =>
          this.formatHourLabel(new Date(start.getTime() + hour * 60 * 60 * 1000)),
        ),
      };
    }

    const days = range === '7d' ? 7 : 30;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    return {
      start,
      end,
      range,
      labels: Array.from({ length: days }, (_value, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return this.formatDayLabel(date);
      }),
    };
  }

  private buildRevenueTrend(
    orders: DashboardOrderRecord[],
    window: ReturnType<AdminService['getDashboardWindow']>,
  ): DashboardOverviewResponseDto['revenueTrend'] {
    const values = Array.from({ length: window.labels.length }, () => 0);

    for (const order of orders) {
      const index = this.getTrendIndex(order.createdAt, window);
      if (index >= 0 && index < values.length) {
        values[index] += order.finalAmount;
      }
    }

    return window.labels.map((label, index) => ({
      label,
      value: this.roundMoney(values[index]),
    }));
  }

  private buildOrdersTrend(
    orders: DashboardOrderRecord[],
    window: ReturnType<AdminService['getDashboardWindow']>,
  ): DashboardOverviewResponseDto['ordersTrend'] {
    const values = window.labels.map(() => ({
      orders: 0,
      delivery: 0,
      dineIn: 0,
      qr: 0,
    }));

    for (const order of orders) {
      const index = this.getTrendIndex(order.createdAt, window);
      if (index < 0 || index >= values.length) {
        continue;
      }

      values[index].orders += 1;

      if (order.orderType === 'DELIVERY') {
        values[index].delivery += 1;
      } else if (order.source === 'QR_DINE_IN' || order.orderType === 'DINE_IN') {
        values[index].dineIn += 1;
        if (order.source === 'QR_DINE_IN') {
          values[index].qr += 1;
        }
      }
    }

    return window.labels.map((label, index) => ({
      label,
      ...values[index],
    }));
  }

  private buildRevenueByRestaurant(
    orders: DashboardOrderRecord[],
  ): DashboardOverviewResponseDto['revenueByRestaurant'] {
    const byRestaurant = new Map<
      number,
      { restaurantId: number; restaurantName: string; revenue: number }
    >();

    for (const order of orders) {
      const current = byRestaurant.get(order.restaurantId) ?? {
        restaurantId: order.restaurantId,
        restaurantName: order.restaurant.name,
        revenue: 0,
      };
      current.revenue += order.finalAmount;
      byRestaurant.set(order.restaurantId, current);
    }

    return [...byRestaurant.values()]
      .map((entry) => ({ ...entry, revenue: this.roundMoney(entry.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }

  private buildOrderTypeSplit(
    orders: DashboardOrderRecord[],
  ): DashboardOverviewResponseDto['orderTypeSplit'] {
    const counts = new Map<string, number>();

    for (const order of orders) {
      const type = order.source === 'QR_DINE_IN' ? 'QR' : order.orderType;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private buildPaymentMethodSplit(
    orders: DashboardOrderRecord[],
  ): DashboardOverviewResponseDto['paymentMethodSplit'] {
    const values = new Map<string, { method: string; count: number; amount: number }>();

    for (const order of orders) {
      const method = order.paymentMethod ?? 'UNKNOWN';
      const current = values.get(method) ?? { method, count: 0, amount: 0 };
      current.count += 1;
      current.amount += order.finalAmount;
      values.set(method, current);
    }

    return [...values.values()]
      .map((entry) => ({ ...entry, amount: this.roundMoney(entry.amount) }))
      .sort((a, b) => b.amount - a.amount);
  }

  private buildRestaurantPerformance(
    restaurants: Array<{ id: number; name: string; isActive: boolean }>,
    orders: DashboardOrderRecord[],
  ): DashboardOverviewResponseDto['restaurantPerformance'] {
    return restaurants
      .map((restaurant) => {
        const restaurantOrders = orders.filter((order) => order.restaurantId === restaurant.id);
        const revenueOrders = restaurantOrders.filter((order) => this.isRevenueOrder(order));
        const revenue = revenueOrders.reduce((sum, order) => sum + order.finalAmount, 0);
        const pending = restaurantOrders.filter((order) =>
          PENDING_ORDER_STATUSES.includes(order.status),
        ).length;
        const cancelled = restaurantOrders.filter(
          (order) => order.status === ORDER_STATUS.CANCELLED,
        ).length;

        return {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          orders: restaurantOrders.length,
          revenue: this.roundMoney(revenue),
          averageOrderValue: revenueOrders.length
            ? this.roundMoney(revenue / revenueOrders.length)
            : 0,
          pending,
          cancelled,
          status: restaurant.isActive ? 'Active' : 'Inactive',
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }

  private buildOrdersNeedingAttention(
    orders: DashboardOrderRecord[],
  ): DashboardOverviewResponseDto['ordersNeedingAttention'] {
    const now = Date.now();
    const attention: DashboardOverviewResponseDto['ordersNeedingAttention'] = [];

    for (const order of orders) {
      const ageMinutes = Math.max(0, Math.floor((now - order.createdAt.getTime()) / 60000));
      const issue = this.getOrderAttentionIssue(order, ageMinutes);

      if (!issue) {
        continue;
      }

      attention.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        restaurantName: order.restaurant.name,
        customerName: order.user?.name ?? null,
        issue,
        ageMinutes,
      });
    }

    return attention.sort((a, b) => b.ageMinutes - a.ageMinutes).slice(0, 10);
  }

  private getOrderAttentionIssue(order: DashboardOrderRecord, ageMinutes: number): string | null {
    if (PENDING_ORDER_STATUSES.includes(order.status) && ageMinutes >= 10) {
      return 'Pending too long';
    }

    if (order.status === ORDER_STATUS.PREPARING && ageMinutes >= 30) {
      return 'Preparing too long';
    }

    if (
      order.orderType === 'DELIVERY' &&
      DELIVERY_ATTENTION_STATUSES.includes(order.status) &&
      !order.delivery
    ) {
      return 'Delivery not assigned';
    }

    if (order.paymentStatus.toUpperCase().includes('FAILED')) {
      return 'Payment failed';
    }

    return null;
  }

  private buildTopSellingItems(
    orders: DashboardOrderRecord[],
  ): DashboardOverviewResponseDto['topSellingItems'] {
    const byItem = new Map<
      number,
      {
        itemId: number;
        itemName: string;
        restaurantName: string;
        quantitySold: number;
        revenue: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const current = byItem.get(item.menuItemId) ?? {
          itemId: item.menuItemId,
          itemName: item.menuItem.name,
          restaurantName: order.restaurant.name,
          quantitySold: 0,
          revenue: 0,
        };
        current.quantitySold += item.quantity;
        current.revenue += item.totalPrice;
        byItem.set(item.menuItemId, current);
      }
    }

    return [...byItem.values()]
      .map((entry) => ({ ...entry, revenue: this.roundMoney(entry.revenue) }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);
  }

  private getTrendIndex(
    value: Date,
    window: ReturnType<AdminService['getDashboardWindow']>,
  ): number {
    if (window.range === 'today') {
      return value.getHours();
    }

    const valueDay = new Date(value);
    valueDay.setHours(0, 0, 0, 0);

    return Math.floor((valueDay.getTime() - window.start.getTime()) / 86400000);
  }

  private formatHourLabel(value: Date): string {
    return value.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      hour12: true,
    });
  }

  private formatDayLabel(value: Date): string {
    return value.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private isRevenueOrder(order: Pick<DashboardOrderRecord, 'status' | 'paymentStatus'>): boolean {
    return !REVENUE_EXCLUDED_STATUSES.includes(order.status) && order.paymentStatus === 'PAID';
  }

  async createStaff(payload: CreateStaffUserDto): Promise<StaffUserDto> {
    if (![Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY, Role.POS_STAFF].includes(payload.role)) {
      throw new BadRequestException(
        'Only admin, manager, delivery boy, and POS staff can be created',
      );
    }

    const email = payload.email?.trim().toLowerCase() || null;
    const phone = payload.phone?.trim() || null;
    const name = payload.name?.trim() || null;
    const profileImageUrl = this.normalizeOptionalString(payload.profileImageUrl);

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    if (payload.role === Role.DELIVERY_BOY && !phone) {
      throw new BadRequestException('Phone is required when creating a delivery boy');
    }

    const password = await hash(this.normalizeStaffPassword(payload.password), 10);
    const permissions = this.normalizePermissions(payload.permissions, payload.role);

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
          profileImageUrl,
          password,
          permissions,
          role: {
            create: { roleId: role.id },
          },
          restaurantId: payload.role === Role.POS_STAFF ? (payload.restaurantId ?? null) : null,
        },
        include: STAFF_USER_INCLUDE,
      });

      if (payload.role === Role.DELIVERY_BOY) {
        await transaction.deliveryAgent.create({
          data: {
            userId: created.id,
            name: name ?? email ?? phone!,
            phone: phone!,
            ...this.normalizeDeliveryAgentProfileForCreate(payload.deliveryAgent),
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

    return this.mapStaffUser(user);
  }

  async updateStaff(
    id: number,
    payload: UpdateStaffUserDto,
    requester: AuthenticatedUser,
  ): Promise<StaffUserDto> {
    const user = await this.findStaffUserOrThrow(id);
    const currentRole = this.getUserRole(user);
    const nextRole = payload.role ?? currentRole;

    this.assertManageableStaffRole(nextRole);
    this.assertCanMutateStaffUser(user, requester);

    const email =
      payload.email === undefined ? user.email : payload.email?.trim().toLowerCase() || null;
    const phone = payload.phone === undefined ? user.phone : payload.phone?.trim() || null;
    const name = payload.name === undefined ? user.name : payload.name?.trim() || null;
    const profileImageUrl =
      payload.profileImageUrl === undefined
        ? undefined
        : this.normalizeOptionalString(payload.profileImageUrl);
    const shouldReplaceProfileImageUrl =
      profileImageUrl !== undefined && profileImageUrl !== user.profileImageUrl;

    if (!email && !phone) {
      throw new BadRequestException('Email or phone is required');
    }

    if (nextRole === Role.DELIVERY_BOY && !phone) {
      throw new BadRequestException('Phone is required when creating or editing a delivery boy');
    }

    const conflicts: Prisma.UserWhereInput[] = [];
    if (email) conflicts.push({ email });
    if (phone) conflicts.push({ phone });

    if (conflicts.length) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: { not: id },
          OR: conflicts,
        },
      });

      if (existingUser) {
        throw new BadRequestException('Email or phone is already in use');
      }
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      const role = await transaction.roleMaster.findUnique({
        where: { name: nextRole },
      });

      if (!role) {
        throw new BadRequestException(`${nextRole} role is not configured`);
      }

      await transaction.userRole.deleteMany({ where: { userId: id } });
      await transaction.userRole.create({
        data: {
          userId: id,
          roleId: role.id,
        },
      });

      const updatedUser = await transaction.user.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          profileImageUrl,
          profileImagePublicId: shouldReplaceProfileImageUrl ? null : undefined,
          permissions: this.normalizePermissions(payload.permissions, nextRole),
          restaurantId: nextRole === Role.POS_STAFF ? (payload.restaurantId ?? null) : null,
        },
        include: STAFF_USER_INCLUDE,
      });

      if (nextRole === Role.DELIVERY_BOY) {
        const existingDeliveryAgent =
          updatedUser.deliveryAgent ??
          (await transaction.deliveryAgent.findFirst({
            where: {
              userId: null,
              phone: phone!,
            },
            orderBy: { id: 'desc' },
          }));

        if (existingDeliveryAgent) {
          await transaction.deliveryAgent.update({
            where: { id: existingDeliveryAgent.id },
            data: {
              userId: id,
              name: name ?? email ?? phone!,
              phone: phone!,
              ...this.normalizeDeliveryAgentProfileForUpdate(payload.deliveryAgent),
            },
          });
        } else {
          await transaction.deliveryAgent.create({
            data: {
              userId: id,
              name: name ?? email ?? phone!,
              phone: phone!,
              ...this.normalizeDeliveryAgentProfileForCreate(payload.deliveryAgent),
            },
          });
        }
      }

      const refreshed = await transaction.user.findUnique({
        where: { id },
        include: STAFF_USER_INCLUDE,
      });

      if (!refreshed) {
        throw new BadRequestException('Unable to update staff user');
      }

      return refreshed;
    });

    if (shouldReplaceProfileImageUrl) {
      await this.cloudinaryService.deleteImage(user.profileImagePublicId);
    }

    return this.mapStaffUser(updated);
  }

  async uploadStaffProfileImage(id: number, file: Express.Multer.File): Promise<StaffUserDto> {
    const user = await this.findStaffUserOrThrow(id);

    if (this.getUserRole(user) !== Role.DELIVERY_BOY || !user.deliveryAgent) {
      throw new BadRequestException('Profile image upload is only available for delivery boys');
    }

    let uploadedImage: CloudinaryImageUploadResult | null = null;

    try {
      uploadedImage = await this.cloudinaryService.uploadImage(file, 'users/profile-images');

      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          profileImageUrl: uploadedImage.secureUrl,
          profileImagePublicId: uploadedImage.publicId,
        },
        include: STAFF_USER_INCLUDE,
      });

      await this.cloudinaryService.deleteImage(user.profileImagePublicId);

      return this.mapStaffUser(updated);
    } catch (error) {
      if (uploadedImage) {
        await this.cloudinaryService.deleteImage(uploadedImage.publicId);
      }

      throw error;
    }
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

    const role = this.getUserRole(user);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        permissions: this.normalizePermissions(payload.permissions, role),
      },
      include: STAFF_USER_INCLUDE,
    });

    return this.mapStaffUser(updated);
  }

  async updateStaffPassword(id: number, payload: UpdateStaffPasswordDto): Promise<StaffUserDto> {
    const password = await hash(this.normalizeStaffPassword(payload.password), 10);
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          is: {
            role: {
              name: {
                in: [Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY, Role.POS_STAFF],
              },
            },
          },
        },
      },
      include: STAFF_USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        password,
        failedLoginAttempts: 0,
        lockUntil: null,
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
      include: STAFF_USER_INCLUDE,
    });

    return this.mapStaffUser(updated);
  }

  async updateStaffStatus(
    id: number,
    payload: UpdateStaffStatusDto,
    requester: AuthenticatedUser,
  ): Promise<StaffUserDto> {
    const user = await this.findStaffUserOrThrow(id);

    this.assertCanMutateStaffUser(user, requester);

    if (!payload.isActive) {
      await this.assertCanDeactivateStaffUser(user);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: payload.isActive,
        refreshToken: payload.isActive ? undefined : null,
        refreshTokenExpiresAt: payload.isActive ? undefined : null,
        failedLoginAttempts: payload.isActive ? undefined : 0,
        lockUntil: payload.isActive ? undefined : null,
      },
      include: STAFF_USER_INCLUDE,
    });

    return this.mapStaffUser(updated);
  }

  async deleteStaff(id: number, requester: AuthenticatedUser): Promise<{ deleted: true }> {
    const user = await this.findStaffUserOrThrow(id);

    this.assertCanMutateStaffUser(user, requester);
    await this.assertCanDeactivateStaffUser(user);
    await this.assertCanHardDeleteStaffUser(user);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.deliveryAgent.deleteMany({ where: { userId: id } });
      await transaction.userRole.deleteMany({ where: { userId: id } });
      await transaction.notification.deleteMany({ where: { userId: id } });
      await transaction.socialAccount.deleteMany({ where: { userId: id } });
      await transaction.user.delete({ where: { id } });
    });

    return { deleted: true };
  }

  private mapStaffUser(
    user: StaffUserRecord,
    permissions?: Record<string, string[]>,
  ): StaffUserDto {
    const role = this.getUserRole(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      isActive: user.isActive,
      role,
      permissions: permissions ?? this.readPermissions(user.permissions, role),
      restaurantId: user.restaurantId,
      restaurantName: user.restaurant?.name ?? null,
      deliveryAgent:
        role === Role.DELIVERY_BOY && user.deliveryAgent
          ? {
              id: user.deliveryAgent.id,
              name: user.deliveryAgent.name,
              phone: user.deliveryAgent.phone,
              isAvailable: user.deliveryAgent.isAvailable,
              isVerified: user.deliveryAgent.isVerified,
              address: user.deliveryAgent.address,
              dateOfBirth: this.formatDateOnly(user.deliveryAgent.dateOfBirth),
              gender: user.deliveryAgent.gender,
              emergencyContact: user.deliveryAgent.emergencyContact,
              vehicleType: user.deliveryAgent.vehicleType,
              vehicleNumber: user.deliveryAgent.vehicleNumber,
              vehicleBrand: user.deliveryAgent.vehicleBrand,
              vehicleColor: user.deliveryAgent.vehicleColor,
            }
          : null,
    };
  }

  private normalizeDeliveryAgentProfileForCreate(
    profile: CreateStaffUserDto['deliveryAgent'] | UpdateStaffUserDto['deliveryAgent'],
  ): Required<DeliveryAgentProfileData> {
    return {
      isVerified: profile?.isVerified ?? false,
      address: this.normalizeOptionalString(profile?.address),
      dateOfBirth: this.normalizeOptionalDate(profile?.dateOfBirth),
      gender: this.normalizeOptionalString(profile?.gender),
      emergencyContact: this.normalizeOptionalString(profile?.emergencyContact),
      vehicleType: this.normalizeOptionalString(profile?.vehicleType),
      vehicleNumber: this.normalizeVehicleNumber(profile?.vehicleNumber),
      vehicleBrand: this.normalizeOptionalString(profile?.vehicleBrand),
      vehicleColor: this.normalizeOptionalString(profile?.vehicleColor),
    };
  }

  private normalizeDeliveryAgentProfileForUpdate(
    profile: UpdateStaffUserDto['deliveryAgent'],
  ): DeliveryAgentProfileData {
    if (!profile) {
      return {};
    }

    return {
      isVerified: profile.isVerified,
      address:
        profile.address === undefined ? undefined : this.normalizeOptionalString(profile.address),
      dateOfBirth:
        profile.dateOfBirth === undefined
          ? undefined
          : this.normalizeOptionalDate(profile.dateOfBirth),
      gender:
        profile.gender === undefined ? undefined : this.normalizeOptionalString(profile.gender),
      emergencyContact:
        profile.emergencyContact === undefined
          ? undefined
          : this.normalizeOptionalString(profile.emergencyContact),
      vehicleType:
        profile.vehicleType === undefined
          ? undefined
          : this.normalizeOptionalString(profile.vehicleType),
      vehicleNumber:
        profile.vehicleNumber === undefined
          ? undefined
          : this.normalizeVehicleNumber(profile.vehicleNumber),
      vehicleBrand:
        profile.vehicleBrand === undefined
          ? undefined
          : this.normalizeOptionalString(profile.vehicleBrand),
      vehicleColor:
        profile.vehicleColor === undefined
          ? undefined
          : this.normalizeOptionalString(profile.vehicleColor),
    };
  }

  private normalizeOptionalString(value: string | null | undefined): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private normalizeVehicleNumber(value: string | null | undefined): string | null {
    const normalized = this.normalizeOptionalString(value);

    return normalized ? normalized.toUpperCase() : null;
  }

  private normalizeOptionalDate(value: string | null | undefined): Date | null {
    const normalized = this.normalizeOptionalString(value);

    return normalized ? new Date(`${normalized}T00:00:00.000Z`) : null;
  }

  private formatDateOnly(value: Date | null | undefined): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
  }

  private normalizeStaffPassword(value: string): string {
    const password = value.trim();

    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    return password;
  }

  private assertManageableStaffRole(role: Role): void {
    if (![Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY, Role.POS_STAFF].includes(role)) {
      throw new BadRequestException(
        'Only admin, manager, delivery boy, and POS staff can be managed',
      );
    }
  }

  private async findStaffUserOrThrow(id: number): Promise<StaffUserRecord> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: {
          is: {
            role: {
              name: {
                in: [Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY, Role.POS_STAFF],
              },
            },
          },
        },
      },
      include: STAFF_USER_INCLUDE,
    });

    if (!user) {
      throw new NotFoundException('Staff user not found');
    }

    return user;
  }

  private assertCanMutateStaffUser(user: StaffUserRecord, requester: AuthenticatedUser): void {
    if (user.id === requester.id) {
      throw new BadRequestException('You cannot edit, disable, or delete your own admin account');
    }
  }

  private async assertCanDeactivateStaffUser(user: StaffUserRecord): Promise<void> {
    if (this.getUserRole(user) !== Role.ADMIN) {
      return;
    }

    const activeAdminCount = await this.prisma.user.count({
      where: {
        id: { not: user.id },
        isActive: true,
        role: {
          is: {
            role: {
              name: Role.ADMIN,
            },
          },
        },
      },
    });

    if (activeAdminCount === 0) {
      throw new BadRequestException('At least one active admin account is required');
    }
  }

  private async assertCanHardDeleteStaffUser(user: StaffUserRecord): Promise<void> {
    const candidateAgentIds = (
      await this.prisma.deliveryAgent.findMany({
        where: {
          OR: [{ userId: user.id }, ...(user.phone ? [{ userId: null, phone: user.phone }] : [])],
        },
        select: { id: true },
      })
    ).map((agent) => agent.id);

    const [
      orderCount,
      paymentCount,
      couponUsageCount,
      addressCount,
      cartCount,
      membershipCount,
      loyaltyCount,
      deliveryCount,
    ] = await Promise.all([
      this.prisma.order.count({ where: { userId: user.id } }),
      this.prisma.payment.count({ where: { userId: user.id } }),
      this.prisma.couponUsage.count({ where: { userId: user.id } }),
      this.prisma.userAddress.count({ where: { userId: user.id } }),
      this.prisma.cartItem.count({ where: { userId: user.id } }),
      this.prisma.membership.count({ where: { userId: user.id } }),
      this.prisma.loyaltyTransaction.count({ where: { userId: user.id } }),
      candidateAgentIds.length
        ? this.prisma.delivery.count({
            where: {
              agentId: { in: candidateAgentIds },
            },
          })
        : Promise.resolve(0),
    ]);

    const hasOperationalHistory =
      orderCount +
        paymentCount +
        couponUsageCount +
        addressCount +
        cartCount +
        membershipCount +
        loyaltyCount +
        deliveryCount >
      0;

    if (hasOperationalHistory) {
      throw new BadRequestException(
        'This staff user has operational history. Disable the account instead of deleting it.',
      );
    }
  }

  private normalizePermissions(
    permissions: Record<string, string[]> | undefined,
    role: Role,
  ): Prisma.InputJsonValue {
    const source = permissions ?? getDefaultPermissionsForRoles([role]);
    const normalized: PermissionMap = {};

    for (const [module, actions] of Object.entries(source)) {
      if (!Array.isArray(actions)) {
        continue;
      }

      normalized[module] = [...new Set(actions.map(String).filter(Boolean))];
    }

    return normalized;
  }

  private readPermissions(value: Prisma.JsonValue | null | undefined, role: Role): PermissionMap {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return getDefaultPermissionsForRoles([role]);
    }

    const permissions: PermissionMap = {};

    for (const [module, actions] of Object.entries(value)) {
      if (Array.isArray(actions)) {
        permissions[module] = actions.map(String).filter(Boolean);
      }
    }

    return Object.keys(permissions).length ? permissions : getDefaultPermissionsForRoles([role]);
  }

  private getUserRole(user: StaffUserRecord): Role {
    return (user.role?.role.name as Role | undefined) ?? Role.CUSTOMER;
  }
}
