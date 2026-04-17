import { Injectable } from '@nestjs/common';

import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { PrismaService } from '../../prisma/prisma.service';

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
}
