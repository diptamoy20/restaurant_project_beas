import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrderSource } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(user: AuthenticatedUser): Promise<PosDashboardResponseDto> {
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
      select: { id: true, name: true, isActive: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (!restaurant.isActive) {
      throw new ForbiddenException('Restaurant is inactive');
    }

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(startOfToday.getDate() + 1);

    const [todayOrdersCount, totalOrdersCount, paidOrders] = await Promise.all([
      this.prisma.order.count({
        where: {
          restaurantId: userData.restaurantId,
          source: OrderSource.POS,
          createdAt: { gte: startOfToday, lt: endOfToday },
        },
      }),
      this.prisma.order.count({
        where: {
          restaurantId: userData.restaurantId,
          source: OrderSource.POS,
        },
      }),
      this.prisma.order.findMany({
        where: {
          restaurantId: userData.restaurantId,
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
        id: restaurant.id,
        name: restaurant.name,
      },
      summary: {
        todayOrders: todayOrdersCount,
        totalRevenue,
        totalOrders: totalOrdersCount,
        averageOrderValue,
      },
    };
  }
}
