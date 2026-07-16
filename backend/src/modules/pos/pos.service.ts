import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrderSource } from '@prisma/client';

import { PosCouponsQueryDto } from './dto/pos-coupons-query.dto';
import { PosCreateOrderDto } from './dto/pos-create-order.dto';
import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';
import { PosMenuQueryDto } from './dto/pos-menu-query.dto';
import { PosMenuResponseDto } from './dto/pos-menu-response.dto';
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

    const existingCustomer = await this.prisma.user.findUnique({
      where: { phone: dto.customerPhone },
      select: { id: true },
    });

    const created = await this.ordersService.createOrder({
      userId: existingCustomer?.id ?? null,
      restaurantId,
      source: OrderSource.POS,
      orderType: dto.orderType ?? 'TAKEAWAY',
      paymentMethod: dto.paymentMethod ?? 'CASH',
      couponCode: dto.couponCode,
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
    }

    const order = await this.prisma.order.findUnique({
      where: { id: created.id },
      include: {
        items: {
          include: { menuItem: true },
        },
      },
    });

    return this.mapPosOrder(order!, paymentMethod, dto.customerPhone);
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
      items: {
        menuItemId: number;
        quantity: number;
        price: number;
        totalPrice: number;
        menuItem: { name: string; imageUrl: string | null } | null;
      }[];
    },
    paymentMethod: string,
    customerPhone: string,
  ): PosOrderResponseDto {
    const displayNumber = `ORD-${order.orderNumber}`;

    return {
      id: displayNumber,
      orderNumber: displayNumber,
      customerPhone,
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
