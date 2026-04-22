import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateOrderDto } from './dto/create-order.dto';
import {
  ORDER_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  type OrderStatus,
} from './constants/order-status.constants';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersRealtimeService } from './orders-realtime.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRealtimeService: OrdersRealtimeService,
  ) {}

  async listOrders(limit = 25): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
      include: this.orderInclude,
    });

    return orders.map((order) => this.mapOrder(order));
  }

  async getOrder(id: number): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapOrder(order);
  }

  async createOrder(payload: CreateOrderDto): Promise<OrderResponseDto> {
    const orderNumber = `ORD-${Date.now()}`;
    const totalAmount = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const order = await this.prisma.order.create({
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
      include: this.orderInclude,
    });

    const mappedOrder = this.mapOrder(order);
    this.ordersRealtimeService.emitNewOrder(mappedOrder);
    return mappedOrder;
  }

  async updateOrderStatus(orderId: number, status: OrderStatus): Promise<OrderResponseDto> {
    if (!ORDER_STATUSES.includes(status)) {
      throw new BadRequestException('Unsupported order status');
    }

    const existingOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.orderInclude,
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    const currentStatus = existingOrder.status as OrderStatus;

    if (currentStatus === status) {
      return this.mapOrder(existingOrder);
    }

    const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[currentStatus];

    if (!allowedNextStatuses?.includes(status)) {
      throw new BadRequestException(`Status cannot change from ${currentStatus} to ${status}`);
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        statusLogs: {
          create: [{ status }],
        },
      },
      include: this.orderInclude,
    });

    const mappedOrder = this.mapOrder(updatedOrder);
    this.ordersRealtimeService.emitOrderUpdate(mappedOrder);
    return mappedOrder;
  }

  private readonly orderInclude = {
    items: {
      include: {
        menuItem: true,
        variant: true,
      },
    },
    statusLogs: {
      orderBy: {
        changedAt: 'asc' as const,
      },
    },
    payments: true,
    restaurant: true,
  };

  private mapOrder(order: {
    id: number;
    userId: number;
    restaurantId: number;
    tableId: number | null;
    addressId: number | null;
    orderNumber: string;
    status: string;
    orderType: string;
    totalAmount: number;
    discountAmount: number | null;
    finalAmount: number;
    paymentStatus: string;
    createdAt: Date;
    updatedAt?: Date;
    items: {
      id: number;
      orderId: number;
      menuItemId: number;
      variantId: number | null;
      quantity: number;
      price: number;
      totalPrice: number;
      menuItem?: {
        id: number;
        name: string;
        price: number;
      };
      variant?: {
        id: number;
        name: string;
        price: number;
      } | null;
    }[];
    statusLogs: {
      id: number;
      orderId: number;
      status: string;
      changedAt: Date;
    }[];
    payments?: {
      id: number;
      orderId: number;
      userId: number;
      transactionId: string | null;
      amount: number;
      status: string;
      method: string;
    }[];
    restaurant?: {
      id: number;
      name: string;
      address: string;
      city: string | null;
    };
  }): OrderResponseDto {
    return {
      id: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      addressId: order.addressId,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt ?? order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        totalPrice: item.totalPrice,
        menuItem: item.menuItem
          ? {
              id: item.menuItem.id,
              name: item.menuItem.name,
              price: item.menuItem.price,
            }
          : undefined,
        variant: item.variant
          ? {
              id: item.variant.id,
              name: item.variant.name,
              price: item.variant.price,
            }
          : item.variant,
      })),
      statusLogs: order.statusLogs.map((statusLog) => ({
        id: statusLog.id,
        orderId: statusLog.orderId,
        status: statusLog.status,
        changedAt: statusLog.changedAt,
      })),
      payments: order.payments?.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        userId: payment.userId,
        transactionId: payment.transactionId,
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
      })),
      restaurant: order.restaurant
        ? {
            id: order.restaurant.id,
            name: order.restaurant.name,
            address: order.restaurant.address,
            city: order.restaurant.city,
          }
        : undefined,
    };
  }
}
