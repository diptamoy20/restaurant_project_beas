import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getOrder(id: number): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            menuItem: true,
            variant: true,
          },
        },
        statusLogs: true,
        payments: true,
        restaurant: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async createOrder(payload: CreateOrderDto): Promise<any> {
    const orderNumber = `ORD-${Date.now()}`;
    const totalAmount = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return this.prisma.order.create({
      data: {
        userId: payload.userId,
        restaurantId: payload.restaurantId,
        tableId: payload.tableId,
        addressId: payload.addressId,
        orderNumber,
        status: 'PLACED',
        orderType: payload.orderType,
        totalAmount,
        discountAmount: payload.discountAmount ?? 0,
        finalAmount: totalAmount - (payload.discountAmount ?? 0),
        paymentStatus: 'PENDING',
        items: {
          create: payload.items.map((item) => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.price * item.quantity,
          })),
        },
        statusLogs: {
          create: [{ status: 'PLACED' }],
        },
      },
      include: {
        items: true,
        statusLogs: true,
      },
    });
  }
}
