import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrderSource } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';
import { PosMenuQueryDto } from './dto/pos-menu-query.dto';
import { PosMenuResponseDto } from './dto/pos-menu-response.dto';

@Injectable()
export class PosService {
  constructor(private readonly prisma: PrismaService) {}

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
      select: { id: true, name: true, isActive: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (!restaurant.isActive) {
      throw new ForbiddenException('Restaurant is inactive');
    }

    return { restaurantId: restaurant.id, restaurantName: restaurant.name };
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

  async getPosMenu(user: AuthenticatedUser, query: PosMenuQueryDto): Promise<PosMenuResponseDto> {
    const { restaurantId } = await this.resolveUserRestaurant(user);

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

    return {
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
}
