import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { ORDER_STATUS } from '../../common/constants/order-status';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        menuItem: true;
        variant: true;
      };
    };
    statusLogs: true;
    payments: true;
    restaurant: true;
  };
}>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listMyOrders(userId: number): Promise<OrderResponseDto[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
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

    return orders.map((order) => this.mapOrder(order));
  }

  async acceptOrderByAdmin(orderId: number): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true, variant: true } },
        statusLogs: true,
        payments: true,
        restaurant: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const allowed = new Set<string>([
      ORDER_STATUS.PENDING,
      ORDER_STATUS.PLACED,
    ]);

    if (!allowed.has(existing.status)) {
      throw new BadRequestException(
        `Order cannot be accepted from status ${existing.status}`,
      );
    }

    const now = new Date();
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: ORDER_STATUS.ACCEPTED,
        acceptedAt: now,
        statusLogs: {
          create: [{ status: ORDER_STATUS.ACCEPTED }],
        },
      },
      include: {
        items: { include: { menuItem: true, variant: true } },
        statusLogs: true,
        payments: true,
        restaurant: true,
      },
    });

    return this.mapOrder(order);
  }

  async updateOrderStatusByAdmin(
    orderId: number,
    status: string,
  ): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: true, variant: true } },
        statusLogs: true,
        payments: true,
        restaurant: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const now = new Date();
    const data: Prisma.OrderUpdateInput = {
      status,
      statusLogs: {
        create: [{ status }],
      },
    };

    if (status === ORDER_STATUS.ACCEPTED) {
      data.acceptedAt = existing.acceptedAt ?? now;
    }

    if (status === ORDER_STATUS.PREPARING) {
      data.preparedAt = existing.preparedAt ?? now;
    }

    if (status === ORDER_STATUS.DELIVERED) {
      data.deliveredAt = now;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        items: { include: { menuItem: true, variant: true } },
        statusLogs: true,
        payments: true,
        restaurant: true,
      },
    });

    return this.mapOrder(order);
  }

  async getOrder(id: number, requester: AuthenticatedUser): Promise<OrderResponseDto> {
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

    if (requester.roles.includes(Role.CUSTOMER) && order.userId !== requester.id) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    return this.mapOrder(order);
  }

  async createOrder(payload: CreateOrderDto): Promise<OrderResponseDto> {
    const order = await this.prisma.$transaction(async (transaction) => {
      if (payload.tableId) {
        const table = await transaction.restaurantTable.findUnique({
          where: { id: payload.tableId },
        });

        if (!table || table.restaurantId !== payload.restaurantId) {
          throw new BadRequestException('Selected table does not belong to this restaurant');
        }
      }

      const menuItemIds = [...new Set(payload.items.map((item) => item.menuItemId))];
      const menuItems = await transaction.menuItem.findMany({
        where: {
          id: {
            in: menuItemIds,
          },
        },
        include: {
          variants: true,
        },
      });
      const menuItemById = new Map(menuItems.map((item) => [item.id, item]));
      const orderItems = payload.items.map((item) => {
        const menuItem = menuItemById.get(item.menuItemId);

        if (!menuItem || !menuItem.isAvailable) {
          throw new BadRequestException(`Menu item ${item.menuItemId} is not available`);
        }

        if (menuItem.restaurantId !== payload.restaurantId) {
          throw new BadRequestException('Cart contains menu items from another restaurant');
        }

        const variant = item.variantId
          ? menuItem.variants.find((candidate) => candidate.id === item.variantId)
          : null;

        if (item.variantId && !variant) {
          throw new BadRequestException(`Variant ${item.variantId} is not valid for this item`);
        }

        const price = variant?.price ?? menuItem.price;

        return {
          menuItemId: item.menuItemId,
          variantId: item.variantId,
          quantity: item.quantity,
          price,
          totalPrice: price * item.quantity,
        };
      });
      const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const discountAmount = payload.discountAmount ?? 0;

      if (discountAmount < 0 || discountAmount > totalAmount) {
        throw new BadRequestException('Discount amount is not valid for this order');
      }

      const createdOrder = await transaction.order.create({
        data: {
          userId: payload.userId,
          restaurantId: payload.restaurantId,
          tableId: payload.tableId,
          addressId: payload.addressId,
          orderNumber: `ORD-${Date.now()}`,
          status: ORDER_STATUS.PENDING,
          orderType: payload.orderType,
          totalAmount,
          discountAmount,
          finalAmount: totalAmount - discountAmount,
          paymentStatus: 'PENDING',
          items: {
            create: orderItems,
          },
          statusLogs: {
            create: [{ status: ORDER_STATUS.PENDING }],
          },
        },
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

      await transaction.cartItem.deleteMany({
        where: {
          userId: payload.userId,
        },
      });

      return createdOrder;
    });

    return this.mapOrder(order);
  }

  private mapOrder(order: OrderWithRelations): OrderResponseDto {
    const preparationMinutes = order.items
      .map((item) => item.menuItem?.preparationTime)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    const maxPrep =
      preparationMinutes.length > 0 ? Math.max(...preparationMinutes) : 20;
    const deliveryBuffer = order.orderType === 'DELIVERY' ? 25 : 10;
    const estimatedDeliveryMinutes = Math.min(
      120,
      Math.max(15, maxPrep + deliveryBuffer),
    );

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
      paymentMethod: order.paymentMethod,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentRetryCount: order.paymentRetryCount,
      createdAt: order.createdAt,
      acceptedAt: order.acceptedAt ?? null,
      preparedAt: order.preparedAt ?? null,
      deliveredAt: order.deliveredAt ?? null,
      estimatedDeliveryMinutes,
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
