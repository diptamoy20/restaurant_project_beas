import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, OrderSource } from '@prisma/client';

import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { CreateOrderType } from './types/create-order.type';
import { DELIVERY_STATUS } from '../../common/constants/delivery-status';
import { ORDER_STATUS } from '../../common/constants/order-status';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { BillingService } from '../billing/billing.service';
import { DeliveriesGateway } from '../deliveries/deliveries.gateway';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        menuItem: true;
        variant: true;
        addons: true;
      };
    };
    statusLogs: true;
    payments: true;
    restaurant: true;
    user: true;
    address: true;
    table: true;
    session: true;
    delivery: {
      include: {
        agent: true;
        trackingLogs: true;
      };
    };
    invoice: true;
  };
}>;

const ORDER_INCLUDE = {
  items: {
    include: {
      menuItem: true,
      variant: true,
      addons: true, // Ensure each order item returns its selected order_item_addons relations
    },
  },
  statusLogs: true,
  payments: true,
  restaurant: true,
  user: true,
  address: true,
  table: true,
  session: true,
  delivery: {
    include: {
      agent: true,
      trackingLogs: {
        orderBy: { recordedAt: 'desc' as const },
        take: 1,
      },
    },
  },
  invoice: true,
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly deliveriesGateway: DeliveriesGateway,
  ) {}

  async listMyOrders(
    userId: number,
    query?: { offset?: number; limit?: number },
  ): Promise<PaginatedResult<OrderResponseDto>> {
    const pagination = normalizePagination(query, { limit: 20, maxLimit: 50 });
    const where: Prisma.OrderWhereInput = { userId };
    const [total, orders, latestDelivered] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: ORDER_INCLUDE,
        ...toPrismaPagination(pagination),
      }),
      this.prisma.order.findFirst({
        where: { userId, status: ORDER_STATUS.DELIVERED },
        orderBy: { deliveredAt: 'desc' },
        select: { id: true },
      }),
    ]);

    const reorderOrderId = latestDelivered?.id ?? null;

    return {
      items: orders.map((order) => this.mapOrder(order, reorderOrderId)),
      ...buildPaginationMeta(total, pagination),
    };
  }

  async listOrdersForAdmin(query: AdminOrderQueryDto): Promise<PaginatedResult<OrderResponseDto>> {
    const pagination = normalizePagination(query, { limit: 10, maxLimit: 100 });
    const where = this.buildAdminOrderWhere(query);

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPagination(pagination),
        include: ORDER_INCLUDE,
      }),
    ]);

    return {
      items: orders.map((order) => this.mapOrder(order)),
      ...buildPaginationMeta(total, pagination),
    };
  }

  async acceptOrderByAdmin(orderId: number): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const allowed = new Set<string>([ORDER_STATUS.PENDING, ORDER_STATUS.PLACED]);

    // if (!allowed.has(existing.status)) {
    //   throw new BadRequestException(`Order cannot be accepted from status ${existing.status}`);
    // }

    if (!allowed.has(existing.status)) {
      throw new BadRequestException(`Order cannot be accepted from status ${existing.status}`);
    }

    /**
     * Delivery orders must have delivery boy assigned
     * before admin accepts the order
     */
    if (existing.orderType === 'DELIVERY' && (!existing.delivery || !existing.delivery.agentId)) {
      throw new BadRequestException('Assign a delivery boy before accepting this order');
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
      include: ORDER_INCLUDE,
    });

    // return this.mapOrder(order);

    const mapped = this.mapOrder(order);

    const latestLocation = DeliveriesGateway.resolveLatestLocation(
      ORDER_STATUS.ACCEPTED,
      order.delivery?.trackingLogs?.[0],
      order.restaurant,
    );

    this.deliveriesGateway.emitOrderUpdated(order.id, {
      type: 'ORDER_ACCEPTED',
      status: 'ACCEPTED',
      order: mapped,
      latestLocation,
    });

    // Targeted per-order event only — no global broadcast needed.
    // The admin list updates via RTK Query tag invalidation on the mutation response.

    return mapped;
  }

  async listDeliveryAgents(options?: {
    availableOnly?: boolean;
  }): Promise<Array<{ id: number; name: string; phone: string; isAvailable: boolean }>> {
    const where: Prisma.DeliveryAgentWhereInput = {
      ...(options?.availableOnly ? { isAvailable: true } : {}),
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
    };

    const agents = await this.prisma.deliveryAgent.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        isAvailable: true,
      },
    });

    return agents;
  }

  async assignDeliveryAgentByAdmin(orderId: number, agentId: number): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    if (existing.orderType !== 'DELIVERY') {
      throw new BadRequestException('Only delivery orders can be assigned to a delivery boy');
    }

    if (existing.delivery?.status === DELIVERY_STATUS.DELIVERED) {
      throw new BadRequestException('Delivered orders cannot be reassigned');
    }

    const agent = await this.prisma.deliveryAgent.findFirst({
      where: {
        id: agentId,
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
      select: { id: true },
    });

    if (!agent) {
      throw new NotFoundException('Delivery agent not found');
    }

    const order = await this.prisma.$transaction(async (transaction) => {
      await transaction.delivery.upsert({
        where: { orderId },
        update: {
          agentId,
          status: DELIVERY_STATUS.ASSIGNED,
        },
        create: {
          orderId,
          agentId,
          status: DELIVERY_STATUS.ASSIGNED,
        },
      });

      return transaction.order.findUnique({
        where: { id: orderId },
        include: ORDER_INCLUDE,
      });
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // return this.mapOrder(order);
    const mapped = this.mapOrder(order);

    this.deliveriesGateway.emitOrderUpdated(order.id, {
      status: 'DELIVERY_ASSIGNED',
      order: mapped,
    });

    // this.deliveriesGateway.emitOrdersRefresh();

    return mapped;
  }

  async updateOrderStatusByAdmin(
    orderId: number,
    status: string,
    options: { cancellationReason?: string; changedByUserId?: number } = {},
  ): Promise<OrderResponseDto> {
    const existing = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // Delivery orders must have assigned delivery boy
    const deliveryRequiredStatuses = [
      ORDER_STATUS.ACCEPTED,
      ORDER_STATUS.PREPARING,
      ORDER_STATUS.ON_THE_WAY,
      ORDER_STATUS.DELIVERED,
    ] as string[];

    if (existing.orderType === 'DELIVERY' && deliveryRequiredStatuses.includes(status)) {
      if (!existing.delivery?.agentId) {
        throw new BadRequestException('Please assign a delivery boy before changing order status');
      }
    }

    const now = new Date();
    const cancellationReason = options.cancellationReason?.trim();

    if (status === ORDER_STATUS.CANCELLED && !cancellationReason) {
      throw new BadRequestException('Cancellation reason is required');
    }

    const data: Prisma.OrderUpdateInput = {
      status,
      statusLogs: {
        create: [
          {
            status,
            note: status === ORDER_STATUS.CANCELLED ? cancellationReason : undefined,
            changedByUserId: options.changedByUserId,
          },
        ],
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

    if (status === ORDER_STATUS.SERVED) {
      data.deliveredAt = now;
    }

    if (status === ORDER_STATUS.CANCELLED) {
      data.cancelledAt = now;
      data.cancellationReason = cancellationReason;
      data.cancelledByUserId = options.changedByUserId;
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data,
      include: ORDER_INCLUDE,
    });

    // return this.mapOrder(order);
    const mapped = this.mapOrder(order);

    const latestLocation = DeliveriesGateway.resolveLatestLocation(
      status,
      order.delivery?.trackingLogs?.[0],
      order.restaurant,
    );

    this.deliveriesGateway.emitOrderUpdated(order.id, {
      type: 'ORDER_STATUS_CHANGED',
      status,
      order: mapped,
      latestLocation,
    });

    // Targeted per-order event only — no global broadcast needed.
    // The admin list updates via RTK Query tag invalidation on the mutation response.

    return mapped;
  }

  async getOrder(id: number, requester: AuthenticatedUser): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (requester.role === Role.CUSTOMER && order.userId !== requester.id) {
      throw new ForbiddenException('You do not have permission to access this order');
    }

    // Resolve reorderOrderId only for customer context (non-customer callers get isReOrder=false).
    let reorderOrderId: number | null = null;

    if (requester.role === Role.CUSTOMER && order.userId != null) {
      const latestDelivered = await this.prisma.order.findFirst({
        where: { userId: order.userId, status: ORDER_STATUS.DELIVERED },
        orderBy: { deliveredAt: 'desc' },
        select: { id: true },
      });
      reorderOrderId = latestDelivered?.id ?? null;
    }

    return this.mapOrder(order, reorderOrderId);
  }

  async reorder(orderId: number, userId: number): Promise<OrderResponseDto> {
    // 1. Load the source order with all items and addons.
    const source = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            addons: true,
          },
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Order not found');
    }

    if (source.userId !== userId) {
      throw new ForbiddenException('You do not have permission to reorder this order');
    }

    if (source.status !== ORDER_STATUS.DELIVERED) {
      throw new BadRequestException('Only delivered orders can be reordered');
    }

    // 2. Verify this order is actually the latest delivered one for this user.
    const latestDelivered = await this.prisma.order.findFirst({
      where: { userId, status: ORDER_STATUS.DELIVERED },
      orderBy: { deliveredAt: 'desc' },
      select: { id: true },
    });

    if (!latestDelivered || latestDelivered.id !== orderId) {
      throw new BadRequestException('Only the latest delivered order can be reordered');
    }

    // 3. Rebuild the order through the normal creation pipeline so all validations
    //    (pricing, availability, delivery charge, tax) are recalculated fresh.
    return this.createOrder({
      userId,
      restaurantId: source.restaurantId,
      addressId: source.addressId ?? undefined,
      orderType: source.orderType,
      paymentMethod: source.paymentMethod ?? undefined,
      source: OrderSource.WEBSITE,
      items: source.items.map((item) => ({
        menuItemId: item.menuItemId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        addons: item.addons.map((addon) => ({
          addonGroupId: addon.addonGroupId ?? 0,
          addonOptionId: addon.addonOptionId ?? 0,
        })),
      })),
    });
  }

  async createOrder(payload: CreateOrderType): Promise<OrderResponseDto> {
    const order = await this.prisma.$transaction<OrderWithRelations>(async (transaction) => {
      if (payload.tableId) {
        const table = await transaction.restaurantTable.findUnique({
          where: { id: payload.tableId },
        });

        if (!table || table.restaurantId !== payload.restaurantId) {
          throw new BadRequestException('Selected table does not belong to this restaurant');
        }

        if (!table.isActive) {
          throw new BadRequestException('Selected table is not active');
        }
      }

      if (payload.sessionId) {
        const session = await transaction.tableSession.findUnique({
          where: { id: payload.sessionId },
        });

        if (!session) {
          throw new BadRequestException('Selected session was not found');
        }

        if (session.status !== 'ACTIVE') {
          throw new BadRequestException('Selected session is no longer active');
        }

        if (session.restaurantId !== payload.restaurantId) {
          throw new BadRequestException('Selected session does not belong to this restaurant');
        }

        if (payload.tableId && session.tableId !== payload.tableId) {
          throw new BadRequestException('Selected session does not belong to this table');
        }
      }

      if (payload.addressId) {
        if (!payload.userId) {
          throw new BadRequestException('A signed-in customer is required for saved addresses');
        }

        const address = await transaction.userAddress.findFirst({
          where: { id: payload.addressId, userId: payload.userId },
          select: { id: true },
        });

        if (!address) {
          throw new BadRequestException('Selected address does not belong to this customer');
        }
      }

      const billing = await this.billingService.calculateQuote(
        {
          restaurantId: payload.restaurantId,
          userId: payload.userId,
          addressId: payload.addressId,
          deliveryCoordinates:
            payload.deliveryLat !== undefined && payload.deliveryLng !== undefined
              ? {
                  lat: payload.deliveryLat,
                  lng: payload.deliveryLng,
                }
              : undefined,
          orderType: payload.orderType,
          items: payload.items,
          couponCode: payload.couponCode,
          manualDiscountAmount: payload.manualDiscountAmount,
          // allowManualDiscount: payload.source === 'ADMIN',
          allowManualDiscount: payload.source === OrderSource.ADMIN,
          tipAmount: payload.tipAmount,
        },
        transaction,
      );

      const isRazorpayOrder = payload.paymentMethod === 'RAZORPAY';
      const orderStatus = isRazorpayOrder ? ORDER_STATUS.PAYMENT_PENDING : ORDER_STATUS.PENDING;

      const existingDraftOrder =
        isRazorpayOrder && payload.userId
          ? await transaction.order.findFirst({
              where: {
                userId: payload.userId,
                restaurantId: payload.restaurantId,
                status: ORDER_STATUS.PAYMENT_PENDING,
                paymentMethod: 'RAZORPAY',
              },
              orderBy: { createdAt: 'desc' },
            })
          : null;

      if (existingDraftOrder) {
        const updatedOrder = await transaction.order.update({
          where: { id: existingDraftOrder.id },
          data: {
            status: ORDER_STATUS.PAYMENT_PENDING,
            source: payload.source,
            orderType: payload.orderType,
            totalAmount: billing.mrpSubtotal,
            deliveryCharge: billing.deliveryCharge,
            packagingCharge: billing.packagingCharge,
            tipAmount: billing.tipAmount,
            deliveryDistanceKm: billing.deliveryDistanceKm,
            discountAmount:
              billing.menuDiscountAmount +
              billing.couponDiscountAmount +
              billing.manualDiscountAmount,
            finalAmount: billing.finalAmount,
            subtotalAmount: billing.subtotalAmount,
            menuDiscountAmount: billing.menuDiscountAmount,
            couponDiscountAmount: billing.couponDiscountAmount,
            manualDiscountAmount: billing.manualDiscountAmount,
            taxableAmount: billing.taxableAmount,
            gstRate: billing.gstRate,
            cgstAmount: billing.cgstAmount,
            sgstAmount: billing.sgstAmount,
            igstAmount: billing.igstAmount,
            taxAmount: billing.taxAmount,
            paymentStatus: 'PENDING',
            paymentMethod: 'RAZORPAY',
            paymentFailureReason: null,
            razorpayOrderId: null,
            razorpayPaymentId: null,
            razorpaySignature: null,
            razorpayDetails: Prisma.DbNull,
            items: {
              deleteMany: {},
              create: billing.items.map((item) => ({
                menuItemId: item.menuItemId,
                variantId: item.variantId ?? undefined,
                quantity: item.quantity,
                price: item.unitPrice,
                totalPrice: item.totalPrice,
                addons: item.addons.length ? { create: item.addons } : undefined,
              })),
            },
            coupons: {
              deleteMany: {},
              ...(billing.couponId && payload.userId
                ? {
                    create: {
                      couponId: billing.couponId,
                      userId: payload.userId,
                      discountAmount: billing.couponDiscountAmount,
                    },
                  }
                : {}),
            },
          },
          include: ORDER_INCLUDE,
        });

        return updatedOrder;
      }

      const createdOrder = await this.createOrderWithUniqueNumber(transaction, {
        userId: payload.userId ?? null,
        restaurantId: payload.restaurantId,
        tableId: payload.tableId,
        sessionId: payload.sessionId,
        addressId: payload.addressId,
        status: orderStatus,
        source: payload.source,
        orderType: payload.orderType,
        totalAmount: billing.mrpSubtotal,
        deliveryCharge: billing.deliveryCharge,
        packagingCharge: billing.packagingCharge,
        tipAmount: billing.tipAmount,
        deliveryDistanceKm: billing.deliveryDistanceKm,
        discountAmount:
          billing.menuDiscountAmount + billing.couponDiscountAmount + billing.manualDiscountAmount,
        finalAmount: billing.finalAmount,
        subtotalAmount: billing.subtotalAmount,
        menuDiscountAmount: billing.menuDiscountAmount,
        couponDiscountAmount: billing.couponDiscountAmount,
        manualDiscountAmount: billing.manualDiscountAmount,
        taxableAmount: billing.taxableAmount,
        gstRate: billing.gstRate,
        cgstAmount: billing.cgstAmount,
        sgstAmount: billing.sgstAmount,
        igstAmount: billing.igstAmount,
        taxAmount: billing.taxAmount,
        paymentStatus: 'PENDING',
        paymentMethod: payload.paymentMethod,
        items: {
          create: billing.items.map((item) => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId ?? undefined,
            quantity: item.quantity,
            price: item.unitPrice,
            totalPrice: item.totalPrice,
            addons: item.addons.length ? { create: item.addons } : undefined,
          })),
        },
        statusLogs: {
          create: [{ status: orderStatus }],
        },
      });

      if (billing.couponId && payload.userId) {
        await transaction.couponUsage.create({
          data: {
            couponId: billing.couponId,
            userId: payload.userId,
            orderId: createdOrder.id,
            discountAmount: billing.couponDiscountAmount,
          },
        });
      }

      if (!isRazorpayOrder && payload.userId) {
        await transaction.cartItem.deleteMany({
          where: {
            userId: payload.userId,
          },
        });
      }

      return createdOrder;
    });

    return this.mapOrder(order);
  }

  private mapOrder(order: OrderWithRelations, reorderOrderId?: number | null): OrderResponseDto {
    const preparationMinutes = order.items
      .map((item) => item.menuItem?.preparationTime)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    const maxPrep = preparationMinutes.length > 0 ? Math.max(...preparationMinutes) : 20;
    const deliveryBuffer = order.orderType === 'DELIVERY' ? 25 : 10;
    const estimatedDeliveryMinutes = Math.min(120, Math.max(15, maxPrep + deliveryBuffer));

    return {
      id: order.id,
      userId: order.userId,
      restaurantId: order.restaurantId,
      tableId: order.tableId,
      sessionId: order.sessionId,
      addressId: order.addressId,
      orderNumber: order.orderNumber,
      status: order.status,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      deliveryCharge: order.deliveryCharge,
      packagingCharge: order.packagingCharge,
      tipAmount: order.tipAmount,
      deliveryDistanceKm: order.deliveryDistanceKm,
      discountAmount: order.discountAmount,
      finalAmount: order.finalAmount,
      subtotalAmount: order.subtotalAmount,
      menuDiscountAmount: order.menuDiscountAmount,
      couponDiscountAmount: order.couponDiscountAmount,
      manualDiscountAmount: order.manualDiscountAmount,
      taxableAmount: order.taxableAmount,
      gstRate: order.gstRate,
      cgstAmount: order.cgstAmount,
      sgstAmount: order.sgstAmount,
      igstAmount: order.igstAmount,
      taxAmount: order.taxAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
      paymentRetryCount: order.paymentRetryCount,
      createdAt: order.createdAt,
      acceptedAt: order.acceptedAt ?? null,
      preparedAt: order.preparedAt ?? null,
      deliveredAt: order.deliveredAt ?? null,
      cancelledAt: order.cancelledAt ?? null,
      cancellationReason: order.cancellationReason ?? null,
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
        addons: item.addons.map((addon) => ({
          id: addon.id,
          addonGroupId: addon.addonGroupId,
          addonOptionId: addon.addonOptionId,
          addonGroupName: addon.addonGroupName,
          addonOptionName: addon.addonOptionName,
          addonOptionPrice: addon.addonOptionPrice,
          quantity: addon.quantity,
        })),
      })),
      statusLogs: order.statusLogs.map((statusLog) => ({
        id: statusLog.id,
        orderId: statusLog.orderId,
        status: statusLog.status,
        note: statusLog.note,
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
      customer: order.user
        ? {
            id: order.user.id,
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone,
          }
        : undefined,
      address: order.address
        ? {
            id: order.address.id,
            label: order.address.label,
            address: order.address.address,
            city: order.address.city,
            state: order.address.state,
          }
        : null,
      table: order.table
        ? {
            id: order.table.id,
            tableNumber: order.table.tableNumber,
          }
        : null,
      session: order.session
        ? {
            id: order.session.id,
            sessionToken: order.session.sessionToken,
            status: order.session.status,
          }
        : null,
      delivery: order.delivery
        ? {
            id: order.delivery.id,
            agentId: order.delivery.agentId,
            agentName: order.delivery.agent?.name ?? null,
            agentPhone: order.delivery.agent?.phone ?? null,
            status: order.delivery.status,
          }
        : null,
      invoice: order.invoice
        ? {
            id: order.invoice.id,
            invoiceNumber: order.invoice.invoiceNumber,
            status: order.paymentStatus === 'PAID' ? 'AVAILABLE' : 'LOCKED',
            canDownload: order.paymentStatus === 'PAID',
          }
        : null,
      isReOrder: reorderOrderId != null && order.id === reorderOrderId,
    };
  }

  private async createOrderWithUniqueNumber(
    transaction: Prisma.TransactionClient,
    data: Omit<Prisma.OrderUncheckedCreateInput, 'orderNumber'>,
  ): Promise<OrderWithRelations> {
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await transaction.order.create({
          data: {
            ...data,
            orderNumber: await this.generateOrderNumber(transaction),
          },
          include: ORDER_INCLUDE,
        });
      } catch (error) {
        if (this.isOrderNumberUniqueConflict(error) && attempt < maxAttempts) {
          continue;
        }

        throw error;
      }
    }

    throw new BadRequestException('Unable to allocate a unique order number');
  }

  private async generateOrderNumber(transaction: Prisma.TransactionClient): Promise<string> {
    const [sequenceValue] = await transaction.$queryRaw<{ nextNumber: bigint }[]>`
      SELECT nextval('orders_order_number_seq')::bigint AS "nextNumber"
    `;

    if (!sequenceValue) {
      throw new BadRequestException('Unable to allocate an order number');
    }

    return `ORD-${sequenceValue.nextNumber.toString()}`;
  }

  private isOrderNumberUniqueConflict(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      return false;
    }

    const target = error.meta?.target;

    return Array.isArray(target) && target.includes('order_number');
  }

  private buildAdminOrderWhere(query: AdminOrderQueryDto): Prisma.OrderWhereInput {
    const and: Prisma.OrderWhereInput[] = [];

    if (query.timeRange === 'last_1_hour' || query.timeRange === 'last_3_hours') {
      const hours = query.timeRange === 'last_1_hour' ? 1 : 3;
      and.push({ createdAt: { gte: new Date(Date.now() - hours * 60 * 60 * 1000) } });
    }

    if (query.type) {
      const orderType = query.type === 'PICKUP' ? 'TAKEAWAY' : query.type;
      and.push({ orderType });
    }

    if (query.payment) {
      and.push({ paymentMethod: { in: this.mapPaymentFilter(query.payment) } });
    }

    and.push({ status: { not: ORDER_STATUS.PAYMENT_PENDING } });

    if (query.status) {
      and.push({ status: query.status });
    }

    if (query.action === 'ACCEPT') {
      and.push({ status: { in: [ORDER_STATUS.PENDING, ORDER_STATUS.PLACED] } });
    }

    if (query.action === 'REJECT') {
      and.push({
        status: {
          in: [
            ORDER_STATUS.PENDING,
            ORDER_STATUS.PLACED,
            ORDER_STATUS.ACCEPTED,
            ORDER_STATUS.PREPARING,
            ORDER_STATUS.ON_THE_WAY,
          ],
        },
      });
    }

    const search = query.search?.trim();
    if (search) {
      const numericSearch = Number(search.replace(/^#/, ''));
      const isNumericSearch = Number.isInteger(numericSearch);
      const searchOr: Prisma.OrderWhereInput[] = isNumericSearch
        ? [{ id: numericSearch }, { orderNumber: { equals: search, mode: 'insensitive' } }]
        : [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { restaurant: { name: { contains: search, mode: 'insensitive' } } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
            { user: { email: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search, mode: 'insensitive' } } },
          ];

      and.push({ OR: searchOr });
    }

    return and.length ? { AND: and } : {};
  }

  private resolveSelectedAddons(
    item: CreateOrderType['items'][number],
    menuItem: Prisma.MenuItemGetPayload<{
      include: {
        variants: true;
        addonGroups: {
          include: {
            options: true;
          };
        };
      };
    }>,
  ): {
    addonGroupId: number;
    addonOptionId: number;
    addonGroupName: string;
    addonOptionName: string;
    addonOptionPrice: number;
    quantity: number;
  }[] {
    const selections = item.addons ?? [];
    const selectionsByGroup = new Map<number, typeof selections>();

    for (const selection of selections) {
      const bucket = selectionsByGroup.get(selection.addonGroupId) ?? [];
      bucket.push(selection);
      selectionsByGroup.set(selection.addonGroupId, bucket);
    }

    for (const group of menuItem.addonGroups.filter((candidate) => candidate.isActive)) {
      const groupSelections = selectionsByGroup.get(group.id) ?? [];
      const minSelect = group.isRequired
        ? Math.max(group.minSelect ?? 1, 1)
        : (group.minSelect ?? 0);
      const maxSelect = group.selectionType === 'SINGLE' ? 1 : group.maxSelect;

      if (groupSelections.length < minSelect) {
        throw new BadRequestException(
          `Please select at least ${minSelect} option(s) for ${group.name}`,
        );
      }

      if (maxSelect !== null && maxSelect !== undefined && groupSelections.length > maxSelect) {
        throw new BadRequestException(
          `Please select no more than ${maxSelect} option(s) for ${group.name}`,
        );
      }
    }

    return selections.map((selection) => {
      const group = menuItem.addonGroups.find(
        (candidate) => candidate.id === selection.addonGroupId,
      );

      if (!group || !group.isActive) {
        throw new BadRequestException(
          `Add-on group ${selection.addonGroupId} is not valid for this item`,
        );
      }

      const option = group.options.find((candidate) => candidate.id === selection.addonOptionId);

      if (!option || !option.isAvailable) {
        throw new BadRequestException(`Add-on option ${selection.addonOptionId} is not available`);
      }

      return {
        addonGroupId: group.id,
        addonOptionId: option.id,
        addonGroupName: group.name,
        addonOptionName: option.name,
        addonOptionPrice: option.price,
        quantity: 1,
      };
    });
  }

  private mapPaymentFilter(payment: string): string[] {
    if (payment === 'CASH') {
      return ['CASH', 'COD', 'CASH_ON_DELIVERY'];
    }

    if (payment === 'CARD') {
      return ['CARD', 'RAZORPAY', 'CREDIT_CARD', 'DEBIT_CARD'];
    }

    return [payment];
  }
}
