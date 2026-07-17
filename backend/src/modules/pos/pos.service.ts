import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, OrderSource } from '@prisma/client';

import { PosCouponsQueryDto } from './dto/pos-coupons-query.dto';
import { PosCreateOrderDto } from './dto/pos-create-order.dto';
import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';
import { PosMenuQueryDto } from './dto/pos-menu-query.dto';
import { PosMenuResponseDto } from './dto/pos-menu-response.dto';
import { PosOrderListQueryDto } from './dto/pos-order-list-query.dto';
import { PosOrderListResponseDto } from './dto/pos-order-list-response.dto';
import { PosOrderResponseDto } from './dto/pos-order-response.dto';
import { ORDER_STATUS } from '../../common/constants/order-status';
import { PAYMENT_STATUS } from '../../common/constants/payment';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { AvailableCouponResponseDto } from '../billing/dto/checkout-quote.dto';
import { CouponsService } from '../coupons/coupons.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
    private readonly couponsService: CouponsService,
  ) {}

  private async resolveUserRestaurant(user: AuthenticatedUser) {
    const userData = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { restaurantId: true, isActive: true },
    });

    if (!userData) {
      throw new NotFoundException('User not found');
    }

    if (!userData.isActive) {
      throw new ForbiddenException('User is inactive');
    }

    if (!userData.restaurantId) {
      throw new ForbiddenException('User is not associated with any restaurant');
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: userData.restaurantId },
      select: {
        id: true,
        name: true,
        address: true,
        gstin: true,
        imageUrl: true,
        gstRate: true,
        gstEnabled: true,
        isActive: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (!restaurant.isActive) {
      throw new ForbiddenException('Restaurant is inactive');
    }

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      restaurantAddress: restaurant.address,
      gstNo: restaurant.gstin,
      restaurantLogo: restaurant.imageUrl,
      gstRate: restaurant.gstRate,
      gstEnabled: restaurant.gstEnabled,
    };
  }

  async getDashboard(user: AuthenticatedUser): Promise<PosDashboardResponseDto> {
    const { restaurantId, restaurantName } = await this.resolveUserRestaurant(user);

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(startOfToday.getDate() + 1);

    const [todayOrdersCount, totalOrdersCount, paidOrders] = await Promise.all([
      this.prisma.order.count({
        where: {
          restaurantId,
          source: OrderSource.POS,
          createdAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          source: OrderSource.POS,
        },
      }),
      this.prisma.order.findMany({
        where: {
          restaurantId,
          source: OrderSource.POS,
          paymentStatus: 'PAID',
        },
        select: { finalAmount: true },
      }),
    ]);

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const averageOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return {
      restaurant: {
        id: restaurantId,
        name: restaurantName,
      },
      summary: {
        todayOrders: todayOrdersCount,
        totalRevenue,
        totalOrders: totalOrdersCount,
        averageOrderValue,
      },
    };
  }

  async getPosCoupons(
    user: AuthenticatedUser,
    query: PosCouponsQueryDto,
  ): Promise<AvailableCouponResponseDto[]> {
    const { restaurantId } = await this.resolveUserRestaurant(user);

    return this.couponsService.listAvailableForCheckout({
      restaurantId,
      userId: user.id,
      subtotalAmount: query.subtotalAmount,
    });
  }

  async getPosMenu(user: AuthenticatedUser, query: PosMenuQueryDto): Promise<PosMenuResponseDto> {
    const {
      restaurantId,
      restaurantName,
      restaurantAddress,
      gstNo,
      restaurantLogo,
      gstRate: restaurantGstRate,
      gstEnabled,
    } = await this.resolveUserRestaurant(user);

    const where = {
      restaurantId,
      isAvailable: true,
    };

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      Object.assign(where, { name: { contains: searchTerm, mode: 'insensitive' as const } });
    }

    const items = await this.prisma.menuItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        discountPrice: true,
        foodType: true,
        isAvailable: true,
        rating: true,
      },
      orderBy: [{ isBestSelling: 'desc' }, { name: 'asc' }],
    });

    const subtotal = items.reduce((sum, item) => sum + (item.discountPrice ?? item.price), 0);
    const gstRate = gstEnabled ? restaurantGstRate : 0;
    const taxableAmount = subtotal;
    const taxAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
    const cgstAmount = Math.round((taxAmount / 2) * 100) / 100;
    const sgstAmount = Math.round((taxAmount - cgstAmount) * 100) / 100;
    const igstAmount = 0;

    return {
      restaurant: {
        restaurant_name: restaurantName,
        restaurant_address: restaurantAddress,
        gst_no: gstNo,
        restaurant_logo: restaurantLogo,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount,
        gstRate,
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        imageUrl: item.imageUrl,
        rating: item.rating,
        price: item.discountPrice ?? item.price,
        isVeg: item.foodType === 'VEG',
        isAvailable: item.isAvailable,
      })),
    };
  }

  async createPosOrder(
    user: AuthenticatedUser,
    dto: PosCreateOrderDto,
  ): Promise<PosOrderResponseDto> {
    const { restaurantId } = await this.resolveUserRestaurant(user);

    const customerPhone = dto.customerPhone || undefined;

    const existingCustomer = customerPhone
      ? await this.prisma.user.findUnique({
          where: { phone: customerPhone },
          select: { id: true },
        })
      : null;

    const created = await this.ordersService.createOrder({
      userId: existingCustomer?.id ?? null,
      restaurantId,
      source: OrderSource.POS,
      orderType: dto.orderType ?? 'TAKEAWAY',
      paymentMethod: dto.paymentMethod ?? 'CASH',
      couponCode: dto.couponCode || undefined,
      tableId: dto.tableId,
      items: dto.items,
    });

    const paymentMethod = (dto.paymentMethod ?? 'CASH').toUpperCase();
    const isRazorpay = paymentMethod === 'RAZORPAY';

    if (!isRazorpay) {
      await this.prisma.order.update({
        where: { id: created.id },
        data: {
          paymentStatus: PAYMENT_STATUS.PAID,
          status: ORDER_STATUS.PENDING,
          customerPhone: customerPhone ?? null,
          statusLogs: {
            create: [{ status: ORDER_STATUS.PENDING }],
          },
        },
      });

      await this.prisma.payment.create({
        data: {
          orderId: created.id,
          userId: existingCustomer?.id ?? user.id,
          amount: created.finalAmount,
          status: PAYMENT_STATUS.PAID,
          method: paymentMethod,
        },
      });
    } else if (customerPhone) {
      await this.prisma.order.update({
        where: { id: created.id },
        data: { customerPhone },
      });
    }

    const order = await this.prisma.order.findUnique({
      where: { id: created.id },
      select: {
        orderNumber: true,
        paymentMethod: true,
        paymentStatus: true,
        subtotalAmount: true,
        discountAmount: true,
        gstRate: true,
        taxAmount: true,
        finalAmount: true,
        createdAt: true,
        customerPhone: true,
        items: {
          select: {
            menuItemId: true,
            quantity: true,
            price: true,
            totalPrice: true,
            menuItem: {
              select: { name: true, imageUrl: true },
            },
          },
        },
      },
    });

    return this.mapPosOrder(order!, paymentMethod);
  }

  async getPosOrders(
    user: AuthenticatedUser,
    query: PosOrderListQueryDto,
  ): Promise<PosOrderListResponseDto> {
    const { restaurantId } = await this.resolveUserRestaurant(user);

    const where: Prisma.OrderWhereInput = {
      restaurantId,
      source: OrderSource.POS,
    };

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      const stripped = searchTerm.replace(/^#/, '');
      const isNumeric = /^\d+$/.test(stripped);

      if (isNumeric) {
        where.OR = [
          { id: Number(stripped) },
          { orderNumber: stripped },
          { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
        ];
      } else {
        where.OR = [
          { orderNumber: { contains: searchTerm, mode: 'insensitive' } },
          { customerPhone: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }
    }

    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    if (query.paymentMethod) {
      where.paymentMethod = query.paymentMethod.toUpperCase();
    }

    if (query.orderStatus) {
      where.status = query.orderStatus;
    }

    if (query.orderType) {
      where.orderType = query.orderType;
    }

    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      const end = new Date(`${query.date}T23:59:59.999Z`);
      where.createdAt = { gte: start, lte: end };
    } else if (query.startDate || query.endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) {
        createdAtFilter.gte = new Date(`${query.startDate}T00:00:00.000Z`);
      }
      if (query.endDate) {
        createdAtFilter.lte = new Date(`${query.endDate}T23:59:59.999Z`);
      }
      where.createdAt = createdAtFilter;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [query.sortBy === 'finalAmount' ? 'finalAmount' : 'createdAt']:
        query.sortOrder === 'asc' ? 'asc' : 'desc',
    };

    const [totalRecords, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          orderType: true,
          paymentStatus: true,
          paymentMethod: true,
          subtotalAmount: true,
          discountAmount: true,
          gstRate: true,
          taxAmount: true,
          finalAmount: true,
          createdAt: true,
          deliveredAt: true,
          cancelledAt: true,
          customerPhone: true,
          items: {
            select: {
              menuItemId: true,
              quantity: true,
              price: true,
              totalPrice: true,
              menuItem: {
                select: { name: true, imageUrl: true },
              },
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      orders: orders.map((order) => ({
        id: `ORD-${order.orderNumber}`,
        orderNumber: `ORD-${order.orderNumber}`,
        customerPhone: order.customerPhone ?? null,
        items: order.items.map((item) => ({
          menuItemId: item.menuItemId,
          name: item.menuItem?.name ?? 'Unknown',
          price: item.price,
          image: item.menuItem?.imageUrl ?? null,
          quantity: item.quantity,
          total: item.totalPrice,
        })),
        paymentMethod: (order.paymentMethod ?? 'CASH').toLowerCase(),
        paymentStatus: order.paymentStatus.toLowerCase(),
        orderStatus: order.status.toLowerCase(),
        orderType: order.orderType.toLowerCase(),
        subtotal: order.subtotalAmount,
        discount: order.discountAmount ?? 0,
        taxRate: order.gstRate / 100,
        taxAmount: order.taxAmount,
        grandTotal: order.finalAmount,
        createdAt: order.createdAt,
        completedAt: order.deliveredAt ?? order.cancelledAt ?? null,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  private mapPosOrder(
    order: {
      orderNumber: string;
      paymentMethod: string | null;
      paymentStatus: string;
      subtotalAmount: number;
      discountAmount: number | null;
      gstRate: number;
      taxAmount: number;
      finalAmount: number;
      createdAt: Date;
      customerPhone: string | null;
      items: {
        menuItemId: number;
        quantity: number;
        price: number;
        totalPrice: number;
        menuItem: { name: string; imageUrl: string | null } | null;
      }[];
    },
    paymentMethod: string,
  ): PosOrderResponseDto {
    const displayNumber = `ORD-${order.orderNumber}`;

    return {
      id: displayNumber,
      orderNumber: displayNumber,
      customerPhone: order.customerPhone ?? null,
      items: order.items.map((item) => ({
        menuItemId: item.menuItemId,
        name: item.menuItem?.name ?? 'Unknown',
        price: item.price,
        image: item.menuItem?.imageUrl ?? null,
        quantity: item.quantity,
        total: item.totalPrice,
      })),
      paymentMethod: paymentMethod.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      subtotal: order.subtotalAmount,
      discount: order.discountAmount ?? 0,
      taxRate: order.gstRate / 100,
      taxAmount: order.taxAmount,
      grandTotal: order.finalAmount,
      createdAt: order.createdAt,
      completedAt: order.paymentStatus === PAYMENT_STATUS.PAID ? order.createdAt : null,
    };
  }
}
