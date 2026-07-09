import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

import { DeliveriesGateway } from './deliveries.gateway';
import {
  DeliveryAgentProfileResponseDto,
  DeliveryBoyDashboardDto,
  DeliveryBoyOrderCardDto,
  DeliveryBoyOrderDetailsDto,
  DeliveryBoyOrderHistoryItemDto,
  DeliveryBoyOrderHistoryResponseDto,
  DeliveryLocationUpdateResponseDto,
  DeliveryTrackingLogDto,
  DeliveryTrackingResponseDto,
  SendOtpResponseDto,
} from './dto';
import {
  buildOrderHistoryPaginationMeta,
  DeliveryBoyOrderHistoryQueryDto,
  DELIVERY_ORDER_HISTORY_PAGE_SIZE,
  getOrderHistoryDayBounds,
  normalizeOrderHistoryPage,
  resolveOrderHistoryCalendarDate,
} from './dto/delivery-boy-order-history-query.dto';
import { DeliveryBoyOrdersQueryDto } from './dto/delivery-boy-query.dto';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { UpdateMyDeliveryLocationDto } from './dto/update-my-delivery-location.dto';
import {
  ACTIVE_DELIVERY_STATUSES,
  DELIVERY_STATUS,
  DeliveryStatusValue,
} from '../../common/constants/delivery-status';
import { ORDER_STATUS } from '../../common/constants/order-status';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import {
  RouteDistanceResult,
  RoutingService,
  RouteStopType,
} from '../../common/routing/routing.service';
import { buildDeliveryTrackingSocketUrl } from '../../common/utils/tracking-socket-url.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { NotificationService } from '../notifications/notification.service';
import { PaymentsService } from '../payments/payments.service';

const DELIVERY_CARD_INCLUDE = {
  order: {
    include: {
      user: true,
      address: true,
      items: {
        select: {
          id: true,
          quantity: true,
        },
      },
    },
  },
} satisfies Prisma.DeliveryInclude;

const DELIVERY_HISTORY_INCLUDE = {
  order: {
    include: {
      user: true,
      address: true,
      restaurant: true,
      items: {
        select: {
          id: true,
          quantity: true,
        },
      },
    },
  },
} satisfies Prisma.DeliveryInclude;

const DELIVERY_DETAIL_INCLUDE = {
  order: {
    include: {
      user: true,
      address: true,
      restaurant: true,
      items: {
        include: {
          menuItem: true,
          variant: true,
          addons: true,
        },
      },
      statusLogs: true,
    },
  },
  trackingLogs: {
    orderBy: { recordedAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.DeliveryInclude;

type DeliveryAgentRecord = Prisma.DeliveryAgentGetPayload<Record<string, never>>;
type DeliveryAgentProfileRecord = Prisma.DeliveryAgentGetPayload<{
  include: { user: true };
}>;
type DeliveryCardRecord = Prisma.DeliveryGetPayload<{ include: typeof DELIVERY_CARD_INCLUDE }>;
type DeliveryHistoryRecord = Prisma.DeliveryGetPayload<{
  include: typeof DELIVERY_HISTORY_INCLUDE;
}>;
type DeliveryDetailRecord = Prisma.DeliveryGetPayload<{ include: typeof DELIVERY_DETAIL_INCLUDE }>;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly paymentsService: PaymentsService,
    private readonly routingService: RoutingService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => DeliveriesGateway))
    private readonly deliveriesGateway: DeliveriesGateway,
  ) {}

  async getDashboard(requester: AuthenticatedUser): Promise<DeliveryBoyDashboardDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);

    const [assigned, onTheWay, delivered, activeOrders] = await Promise.all([
      this.prisma.delivery.count({
        where: { agentId: agent.id, status: DELIVERY_STATUS.ASSIGNED },
      }),
      this.prisma.delivery.count({
        where: {
          agentId: agent.id,
          status: { in: [DELIVERY_STATUS.ON_THE_WAY] },
        },
      }),
      this.prisma.delivery.count({
        where: { agentId: agent.id, status: DELIVERY_STATUS.DELIVERED },
      }),
      this.prisma.delivery.findMany({
        where: { agentId: agent.id, status: { in: ACTIVE_DELIVERY_STATUSES } },
        orderBy: { order: { createdAt: 'desc' } },
        take: 10,
        include: DELIVERY_CARD_INCLUDE,
      }),
    ]);

    return {
      profile: this.mapAgent(agent),
      stats: {
        assigned,
        onTheWay,
        delivered,
      },
      assignedOrders: activeOrders.map((delivery) => this.mapOrderCard(delivery)),
      trackingSocketUrl: buildDeliveryTrackingSocketUrl(this.configService),
    };
  }

  async getMyProfile(requester: AuthenticatedUser): Promise<DeliveryAgentProfileResponseDto> {
    const agent = await this.getCurrentAgentProfileOrThrow(requester);
    const [totalOrders, completedOrders] = await Promise.all([
      this.prisma.delivery.count({
        where: { agentId: agent.id },
      }),
      this.prisma.delivery.count({
        where: { agentId: agent.id, status: DELIVERY_STATUS.DELIVERED },
      }),
    ]);

    return this.mapProfile(agent, totalOrders, completedOrders);
  }

  async getMyOrderHistory(
    requester: AuthenticatedUser,
    query: DeliveryBoyOrderHistoryQueryDto,
  ): Promise<DeliveryBoyOrderHistoryResponseDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const selectedDate = resolveOrderHistoryCalendarDate(query.date);
    const { start, end } = this.getOrderHistoryDayBoundsOrThrow(selectedDate);
    const pagination = normalizeOrderHistoryPage(query.page);
    const where = this.buildDeliveredHistoryWhere(agent.id, start, end);

    const [summaryAggregate, total, deliveries] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          deliveredAt: { gte: start, lte: end },
          delivery: {
            is: {
              agentId: agent.id,
              status: DELIVERY_STATUS.DELIVERED,
            },
          },
        },
        _count: { _all: true },
        _sum: { finalAmount: true },
      }),
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        orderBy: { order: { deliveredAt: 'desc' } },
        include: DELIVERY_HISTORY_INCLUDE,
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      selectedDate,
      summary: {
        totalOrders: summaryAggregate._count._all,
        totalDeliveredAmount: summaryAggregate._sum.finalAmount ?? 0,
      },
      items: deliveries.map((delivery) => this.mapOrderHistoryItem(delivery)),
      ...buildOrderHistoryPaginationMeta(total, pagination.page, DELIVERY_ORDER_HISTORY_PAGE_SIZE),
    };
  }

  async listMyOrders(
    requester: AuthenticatedUser,
    query: DeliveryBoyOrdersQueryDto,
  ): Promise<PaginatedResult<DeliveryBoyOrderCardDto>> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const pagination = normalizePagination(query, { limit: 20, maxLimit: 50 });
    const where: Prisma.DeliveryWhereInput = {
      agentId: agent.id,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, deliveries] = await Promise.all([
      this.prisma.delivery.count({ where }),
      this.prisma.delivery.findMany({
        where,
        orderBy: { order: { createdAt: 'desc' } },
        include: DELIVERY_CARD_INCLUDE,
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: deliveries.map((delivery) => this.mapOrderCard(delivery)),
      ...buildPaginationMeta(total, pagination),
    };
  }

  async getMyOrderDetails(
    requester: AuthenticatedUser,
    orderId: number,
  ): Promise<DeliveryBoyOrderDetailsDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const delivery = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);

    return this.mapOrderDetails(delivery);
  }

  async updateAvailability(
    requester: AuthenticatedUser,
    isAvailable: boolean,
  ): Promise<DeliveryBoyDashboardDto['profile']> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const updated = await this.prisma.deliveryAgent.update({
      where: { id: agent.id },
      data: { isAvailable },
    });

    return this.mapAgent(updated);
  }

  async acceptMyOrder(
    requester: AuthenticatedUser,
    orderId: number,
  ): Promise<DeliveryBoyOrderDetailsDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const existing = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);

    if (existing.status !== DELIVERY_STATUS.ASSIGNED) {
      throw new BadRequestException(`Delivery cannot be accepted from status ${existing.status}`);
    }

    // Admin controls the ON_THE_WAY transition; acknowledge assignment without changing status.
    return this.mapOrderDetails(existing);
  }

  async sendDeliveryOtp(
    requester: AuthenticatedUser,
    orderId: number,
  ): Promise<SendOtpResponseDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);

    let delivery = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);

    if (
      delivery.status !== DELIVERY_STATUS.ON_THE_WAY &&
      delivery.order.status === ORDER_STATUS.ON_THE_WAY
    ) {
      delivery = await this.prisma.delivery.update({
        where: { id: delivery.id },
        data: { status: DELIVERY_STATUS.ON_THE_WAY },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    }

    if (delivery.status !== DELIVERY_STATUS.ON_THE_WAY) {
      throw new BadRequestException('OTP can only be sent for orders that are on the way');
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    if (!delivery.order.userId) {
      throw new BadRequestException('Cannot send OTP for an order without a customer account');
    }

    await this.notificationService.sendPushToUser({
      userId: delivery.order.userId,
      title: 'Delivery Verification OTP',
      body: `Your delivery OTP is ${otp}`,
      data: {
        otp,
        orderId: String(orderId),
      },
    });

    return {
      message: 'OTP sent successfully',
      otp,
    };
  }

  async updateMyOrderStatus(
    requester: AuthenticatedUser,
    orderId: number,
    status: string,
  ): Promise<DeliveryBoyOrderDetailsDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const existing = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);
    const currentStatus = existing.status as DeliveryStatusValue;
    const nextStatus = status as DeliveryStatusValue;

    this.assertDeliveryTransition(currentStatus, nextStatus);

    if (nextStatus !== DELIVERY_STATUS.DELIVERED) {
      throw new BadRequestException('Delivery boys can only mark orders as delivered');
    }

    const isDelivered = true;
    const orderStatus = ORDER_STATUS.DELIVERED;
    let codSettled = false;

    const updated = await this.prisma.$transaction(async (transaction) => {
      const orderUpdateData: Prisma.OrderUpdateInput = {
        status: orderStatus,
        deliveredAt: isDelivered ? new Date() : undefined,
        statusLogs: { create: [{ status: orderStatus }] },
      };

      if (isDelivered) {
        codSettled = await this.paymentsService.prepareCodPaidOrderUpdate(
          transaction,
          existing.order,
          orderUpdateData,
        );
      }

      await transaction.order.update({
        where: { id: orderId },
        data: orderUpdateData,
      });

      if (codSettled) {
        await this.paymentsService.syncCodPaymentRecords(transaction, existing.order);
      }

      return transaction.delivery.update({
        where: { id: existing.id },
        data: { status: nextStatus },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    });

    if (codSettled) {
      await this.paymentsService.finalizeCodPaymentAfterDelivery(orderId);
    }

    const latestLocation = DeliveriesGateway.resolveLatestLocation(
      updated.status,
      updated.trackingLogs[0],
      updated.order.restaurant,
      updated.id,
    );

    this.deliveriesGateway.emitOrderUpdated(orderId, {
      type: 'ORDER_STATUS_CHANGED',
      status: orderStatus,
      order: this.mapOrderForSocket(updated),
      latestLocation,
    });

    return this.mapOrderDetails(updated);
  }

  async updateMyLocation(
    requester: AuthenticatedUser,
    payload: UpdateMyDeliveryLocationDto,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    const agent = await this.getCurrentAgentOrThrow(requester);
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId: payload.orderId },
      select: { id: true, agentId: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found for this order');
    }

    if (delivery.agentId == null) {
      throw new BadRequestException('No delivery boy assigned to this order yet');
    }

    if (delivery.agentId !== agent.id) {
      throw new ForbiddenException('This order is assigned to another delivery boy');
    }

    return this.createTracking(delivery.id, payload);
  }

  async updateMyLiveLocation(
    requester: AuthenticatedUser,
    payload: UpdateMyDeliveryLocationDto,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    return this.updateMyLocation(requester, payload);
  }

  async updateDeliveryLocation(
    payload: UpdateDeliveryLocationDto,
    requester: AuthenticatedUser,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: payload.deliveryId },
      select: { id: true, agentId: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (this.hasRole(requester, Role.DELIVERY_BOY)) {
      const agent = await this.getCurrentAgentOrThrow(requester);

      if (delivery.agentId !== agent.id) {
        throw new ForbiddenException('You do not have permission to update this delivery');
      }
    }

    return this.createTracking(payload.deliveryId, payload);
  }

  async getTrackingByOrder(
    orderId: number,
    requester: AuthenticatedUser,
  ): Promise<DeliveryTrackingResponseDto> {
    // const delivery = await this.prisma.delivery.findUnique({
    //   where: { orderId },
    //   include: {
    //     agent: true,
    //     order: true,
    //     trackingLogs: {
    //       orderBy: { recordedAt: 'desc' },
    //       ...toPrismaPagination({ limit: 20, offset: 0 }),
    //     },
    //   },
    // });

    // const order = await this.prisma.delivery.findUnique({
    //   where: { orderId },
    //   include: {
    //     agent: {
    //       select: {
    //         id: true,
    //         name: true,
    //         phone: true,
    //         isAvailable: true,

    //         vehicleType: true,
    //         vehicleNumber: true,
    //         vehicleBrand: true,
    //         vehicleColor: true,
    //       },
    //     },

    //     order: {
    //       include: {
    //         user: true,
    //         address: true,

    //         items: {
    //           include: {
    //             menuItem: true,
    //             variant: true,
    //             addons: true,
    //           },
    //         },
    //       },
    //     },

    //     trackingLogs: {
    //       orderBy: { recordedAt: 'desc' },
    //       ...toPrismaPagination({ limit: 20, offset: 0 }),
    //     },
    //   },
    // });

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },

      include: {
        user: true,

        address: true,

        restaurant: true,

        items: {
          include: {
            menuItem: true,
            variant: true,
            addons: true,
          },
        },

        delivery: {
          include: {
            order: {
              include: {
                user: true,
                address: true,
                items: {
                  include: {
                    menuItem: true,
                    variant: true,
                    addons: true,
                  },
                },
              },
            },

            agent: {
              select: {
                id: true,
                name: true,
                phone: true,
                isAvailable: true,
                vehicleType: true,
                vehicleNumber: true,
                vehicleBrand: true,
                vehicleColor: true,
                user: {
                  select: {
                    profileImageUrl: true,
                  },
                },
              },
            },

            trackingLogs: {
              orderBy: {
                recordedAt: 'desc',
              },

              take: 20,
            },
          },
        },
      },
    });

    // if (!delivery) {
    //   throw new NotFoundException('Delivery not found for this order');
    // }
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const delivery = order.delivery;

    if (!delivery) {
      return {
        deliveryId: null,

        status: DELIVERY_STATUS.PENDING,

        agent: null,

        customer: {
          id: order.user?.id ?? null,
          name: order.user?.name ?? null,
          phone: order.user?.phone ?? null,
          profileImageUrl: order.user?.profileImageUrl ?? null,

          address: order.address
            ? {
                id: order.address.id,
                label: order.address.label,
                address: order.address.address,
                city: order.address.city,
                state: order.address.state,
                latitude: order.address.latitude,
                longitude: order.address.longitude,
                fullText: this.formatAddress(order.address),
              }
            : null,
        },

        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,

          finalAmount: order.finalAmount,

          paymentStatus: order.paymentStatus,

          itemsSummary: {
            itemCount: order.items.length,

            totalQuantity: order.items.reduce((sum: number, item) => sum + item.quantity, 0),
          },

          items: order.items.map((item) => ({
            id: item.id,
            menuItemId: item.menuItemId,
            name: item.menuItem.name,
            imageUrl: item.menuItem.imageUrl,
            variantName: item.variant?.name ?? null,
            addons: item.addons.map((addon) => addon.addonOptionName),
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.totalPrice,
          })),
        },

        latestLocation: null,

        trackingHistory: [],

        restaurant: order.restaurant ? this.mapTrackingRestaurant(order.restaurant) : null,
      };
    }

    if (this.hasRole(requester, Role.CUSTOMER) && delivery.order.userId !== requester.id) {
      throw new ForbiddenException('You do not have permission to access this delivery tracking');
    }

    if (this.hasRole(requester, Role.DELIVERY_BOY)) {
      const agent = await this.getCurrentAgentOrThrow(requester);

      if (delivery.agentId !== agent.id) {
        throw new ForbiddenException('You do not have permission to access this delivery tracking');
      }
    }

    return {
      deliveryId: delivery.id,
      status: delivery.status === DELIVERY_STATUS.ASSIGNED ? 'DELIVERY_ASSIGNED' : delivery.status,
      agent: delivery.agent
        ? {
            id: delivery.agent.id,
            name: delivery.agent.name,
            phone: delivery.agent.phone,
            profileImageUrl: delivery.agent.user?.profileImageUrl ?? null,
            isAvailable: delivery.agent.isAvailable,

            vehicle: {
              vehicleType: delivery.agent.vehicleType,
              vehicleNumber: delivery.agent.vehicleNumber,
              brand: delivery.agent.vehicleBrand,
              color: delivery.agent.vehicleColor,
            },
          }
        : null,
      customer: {
        id: delivery.order.user?.id ?? null,
        name: delivery.order.user?.name ?? null,
        phone: delivery.order.user?.phone ?? null,
        profileImageUrl: delivery.order.user?.profileImageUrl ?? null,

        address: delivery.order.address
          ? {
              id: delivery.order.address.id,
              label: delivery.order.address.label,
              address: delivery.order.address.address,
              city: delivery.order.address.city,
              state: delivery.order.address.state,
              latitude: delivery.order.address.latitude,
              longitude: delivery.order.address.longitude,
              fullText: this.formatAddress(delivery.order.address),
            }
          : null,
      },

      order: {
        id: delivery.order.id,
        orderNumber: delivery.order.orderNumber,
        status: delivery.order.status,
        finalAmount: delivery.order.finalAmount,
        paymentStatus: delivery.order.paymentStatus,

        itemsSummary: {
          itemCount: delivery.order.items.length,

          totalQuantity: delivery.order.items.reduce((sum, item) => sum + item.quantity, 0),
        },

        items: delivery.order.items.map((item) => ({
          id: item.id,

          menuItemId: item.menuItemId,

          name: item.menuItem.name,

          imageUrl: item.menuItem.imageUrl,

          variantName: item.variant?.name ?? null,

          addons: item.addons.map((addon) => addon.addonOptionName),

          quantity: item.quantity,

          unitPrice: item.price,

          totalPrice: item.totalPrice,
        })),
      },

      latestLocation: delivery.trackingLogs[0]
        ? this.mapTrackingLog(delivery.trackingLogs[0])
        : DeliveriesGateway.resolveLatestLocation(delivery.order.status, null, order.restaurant),
      trackingHistory: delivery.trackingLogs.map((log) => this.mapTrackingLog(log)),
      restaurant: order.restaurant ? this.mapTrackingRestaurant(order.restaurant) : null,
    };
  }

  private async getCurrentAgentOrThrow(requester: AuthenticatedUser): Promise<DeliveryAgentRecord> {
    if (requester.role !== Role.DELIVERY_BOY) {
      throw new ForbiddenException('Only delivery boys can access delivery-agent operations');
    }

    const agent =
      (await this.prisma.deliveryAgent.findUnique({
        where: { userId: requester.id },
      })) ??
      (await this.linkLegacyAgentByPhone(requester)) ??
      (await this.createMissingAgentForDeliveryBoy(requester));

    if (!agent) {
      throw new NotFoundException(
        'Delivery agent profile not linked to this user. Create or link delivery_agents.user_id first.',
      );
    }

    return agent;
  }

  private async getCurrentAgentProfileOrThrow(
    requester: AuthenticatedUser,
  ): Promise<DeliveryAgentProfileRecord> {
    if (requester.role !== Role.DELIVERY_BOY) {
      throw new ForbiddenException('Only delivery boys can access delivery-agent operations');
    }

    const agent =
      (await this.prisma.deliveryAgent.findUnique({
        where: { userId: requester.id },
        include: { user: true },
      })) ??
      (await this.linkLegacyAgentProfileByPhone(requester)) ??
      (await this.createMissingAgentProfileForDeliveryBoy(requester));

    if (!agent) {
      throw new NotFoundException(
        'Delivery agent profile not linked to this user. Create or link delivery_agents.user_id first.',
      );
    }

    return agent;
  }

  private async linkLegacyAgentByPhone(
    requester: AuthenticatedUser,
  ): Promise<DeliveryAgentRecord | null> {
    if (!requester.phone) {
      return null;
    }

    const legacyAgent = await this.prisma.deliveryAgent.findFirst({
      where: {
        userId: null,
        phone: requester.phone,
      },
    });

    if (!legacyAgent) {
      return null;
    }

    // ponytail: safe legacy recovery path, admin flow should keep userId linked going forward
    return this.prisma.deliveryAgent.update({
      where: { id: legacyAgent.id },
      data: { userId: requester.id },
    });
  }

  private async linkLegacyAgentProfileByPhone(
    requester: AuthenticatedUser,
  ): Promise<DeliveryAgentProfileRecord | null> {
    const linkedAgent = await this.linkLegacyAgentByPhone(requester);

    if (!linkedAgent) {
      return null;
    }

    return this.prisma.deliveryAgent.findUnique({
      where: { id: linkedAgent.id },
      include: { user: true },
    });
  }

  private async createMissingAgentForDeliveryBoy(
    requester: AuthenticatedUser,
  ): Promise<DeliveryAgentRecord | null> {
    if (requester.role !== Role.DELIVERY_BOY || !requester.phone) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: requester.id },
      include: {
        role: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive || user.role?.role.name !== Role.DELIVERY_BOY) {
      return null;
    }

    return this.prisma.deliveryAgent.create({
      data: {
        userId: requester.id,
        name: requester.name ?? requester.email ?? requester.phone,
        phone: requester.phone,
      },
    });
  }

  private async createMissingAgentProfileForDeliveryBoy(
    requester: AuthenticatedUser,
  ): Promise<DeliveryAgentProfileRecord | null> {
    const createdAgent = await this.createMissingAgentForDeliveryBoy(requester);

    if (!createdAgent) {
      return null;
    }

    return this.prisma.deliveryAgent.findUnique({
      where: { id: createdAgent.id },
      include: { user: true },
    });
  }

  private async getMyDeliveryByOrderOrThrow(
    agentId: number,
    orderId: number,
  ): Promise<DeliveryDetailRecord> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId, agentId },
      include: DELIVERY_DETAIL_INCLUDE,
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found for this order');
    }

    return delivery;
  }

  private async createTracking(
    deliveryId: number,
    payload: Omit<UpdateMyDeliveryLocationDto, 'orderId'>,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    const tracking = await this.prisma.deliveryTracking.create({
      data: {
        deliveryId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        heading: payload.heading,
      },
    });

    return {
      message: 'Delivery location updated',
      tracking: this.mapTrackingLog(tracking),
    };
  }

  /**
   * Fetches the delivery record for an order with enough data to build the
   * unified socket payload. Used by the gateway after a live location update.
   */
  async getDeliveryWithOrderForSocket(orderId: number): Promise<DeliveryDetailRecord | null> {
    return this.prisma.delivery.findUnique({
      where: { orderId },
      include: DELIVERY_DETAIL_INCLUDE,
    });
  }

  /**
   * Builds a minimal order summary from a DeliveryDetailRecord for use in
   * unified socket payloads (order:updated). Keeps the same shape as the
   * admin OrderResponseDto so the frontend can use one model everywhere.
   */
  mapOrderForSocket(delivery: DeliveryDetailRecord): Record<string, unknown> {
    const order = delivery.order;

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      finalAmount: order.finalAmount,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt ?? null,
      delivery: {
        id: delivery.id,
        status: delivery.status,
      },
    };
  }

  private mapAgent(agent: DeliveryAgentRecord): DeliveryBoyDashboardDto['profile'] {
    return {
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      isAvailable: agent.isAvailable,
    };
  }

  private mapProfile(
    agent: DeliveryAgentProfileRecord,
    totalOrders: number,
    completedOrders: number,
  ): DeliveryAgentProfileResponseDto {
    const name = agent.user?.name ?? agent.name;
    const phone = agent.user?.phone ?? agent.phone;

    return {
      profile: {
        id: agent.id,
        name,
        phone,
        profileImageUrl: agent.user?.profileImageUrl ?? null,
        isVerified: agent.isVerified,
        address: agent.address,
      },
      stats: {
        totalOrders,
        completedOrders,
        rating: null,
      },
      personalDetails: {
        fullName: name,
        dateOfBirth: this.formatDateOnly(agent.dateOfBirth),
        email: agent.user?.email ?? null,
        phone,
        gender: agent.gender,
        emergencyContact: agent.emergencyContact,
      },
      vehicle: {
        vehicleType: agent.vehicleType,
        vehicleNumber: agent.vehicleNumber,
        brand: agent.vehicleBrand,
        color: agent.vehicleColor,
      },
    };
  }

  private buildDeliveredHistoryWhere(
    agentId: number,
    start: Date,
    end: Date,
  ): Prisma.DeliveryWhereInput {
    return {
      agentId,
      status: DELIVERY_STATUS.DELIVERED,
      order: {
        deliveredAt: {
          gte: start,
          lte: end,
        },
      },
    };
  }

  private getOrderHistoryDayBoundsOrThrow(date: string): { start: Date; end: Date } {
    try {
      return getOrderHistoryDayBounds(date);
    } catch {
      throw new BadRequestException('date must be a valid calendar date in YYYY-MM-DD format');
    }
  }

  private mapOrderHistoryItem(delivery: DeliveryHistoryRecord): DeliveryBoyOrderHistoryItemDto {
    const itemCount = delivery.order.items.length;
    const totalQuantity = delivery.order.items.reduce((sum, item) => sum + item.quantity, 0);
    const deliveredAt = delivery.order.deliveredAt ?? null;

    return {
      deliveryId: delivery.id,
      orderId: delivery.order.id,
      orderNumber: delivery.order.orderNumber,
      customerName: delivery.order.user?.name ?? null,
      restaurantName: delivery.order.restaurant.name,
      itemCount,
      totalQuantity,
      finalAmount: delivery.order.finalAmount,
      paymentMethod: delivery.order.paymentMethod,
      paymentStatus: delivery.order.paymentStatus,
      addressText: delivery.order.address ? this.formatAddress(delivery.order.address) : null,
      deliveredAt,
      deliveredTime: deliveredAt ? this.formatTime(deliveredAt) : null,
      minutesAgo: deliveredAt ? this.getMinutesAgo(deliveredAt) : null,
    };
  }

  private mapOrderCard(delivery: DeliveryCardRecord): DeliveryBoyOrderCardDto {
    const itemCount = delivery.order.items.length;
    const totalQuantity = delivery.order.items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      deliveryId: delivery.id,
      orderId: delivery.order.id,
      orderNumber: delivery.order.orderNumber,
      createdAt: delivery.order.createdAt,
      minutesAgo: this.getMinutesAgo(delivery.order.createdAt),
      customerName: delivery.order.user?.name ?? null,
      customerPhone: delivery.order.user?.phone ?? null,
      addressText: delivery.order.address ? this.formatAddress(delivery.order.address) : null,
      itemCount,
      totalQuantity,
      finalAmount: delivery.order.finalAmount,
      paymentMethod: delivery.order.paymentMethod,
      paymentStatus: delivery.order.paymentStatus,
      deliveryStatus: delivery.status,
      orderStatus: delivery.order.status,
    };
  }

  private async mapOrderDetails(
    delivery: DeliveryDetailRecord,
  ): Promise<DeliveryBoyOrderDetailsDto> {
    const order = delivery.order;
    const itemCount = order.items.length;
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedDeliveryMinutes = this.getEstimatedDeliveryMinutes(order);
    const latestLocation = delivery.trackingLogs[0]
      ? this.mapTrackingLog(delivery.trackingLogs[0])
      : null;
    const nextStop = this.resolveNextStop(delivery);
    const routeMetrics = await this.resolveRouteMetrics(delivery, nextStop);
    const fallbackOrderDistance =
      order.deliveryDistanceKm ??
      (order.address && order.restaurant
        ? this.getDistanceKm(
            order.restaurant.latitude,
            order.restaurant.longitude,
            order.address.latitude,
            order.address.longitude,
          )
        : null);
    const airDistanceKm = this.resolveAirDistanceKm(delivery, nextStop, fallbackOrderDistance);
    const routeDistanceKm = routeMetrics?.source === 'ROUTE' ? routeMetrics.distanceKm : null;
    const routeDurationMinutes =
      routeMetrics?.source === 'ROUTE' ? routeMetrics.durationMinutes : null;
    const distanceKm = routeMetrics?.distanceKm ?? airDistanceKm ?? fallbackOrderDistance;
    const distanceSource = routeMetrics
      ? routeMetrics.source
      : airDistanceKm !== null
        ? 'AIR_DISTANCE'
        : fallbackOrderDistance !== null
          ? 'ORDER_QUOTED_DISTANCE'
          : null;

    return {
      deliveryId: delivery.id,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        acceptedAt: order.acceptedAt ?? null,
        preparedAt: order.preparedAt ?? null,
        deliveredAt: order.deliveredAt ?? null,
      },
      customer: {
        id: order.user?.id ?? null,
        name: order.user?.name ?? null,
        phone: order.user?.phone ?? null,
        profileImageUrl: order.user?.profileImageUrl ?? null,
        address: order.address
          ? {
              id: order.address.id,
              label: order.address.label,
              address: order.address.address,
              city: order.address.city,
              state: order.address.state,
              latitude: order.address.latitude,
              longitude: order.address.longitude,
              fullText: this.formatAddress(order.address),
            }
          : null,
      },
      restaurant: {
        id: order.restaurant.id,
        name: order.restaurant.name,
        address: order.restaurant.address,
        city: order.restaurant.city,
        latitude: order.restaurant.latitude,
        longitude: order.restaurant.longitude,
      },
      itemsSummary: {
        itemCount,
        totalQuantity,
      },
      items: order.items.map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        name: item.menuItem.name,
        imageUrl: item.menuItem.imageUrl,
        variantName: item.variant?.name ?? null,
        addons: item.addons.map((addon) => addon.addonOptionName),
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.totalPrice,
      })),
      billing: {
        itemTotal: order.subtotalAmount || order.totalAmount,
        deliveryCharge: order.deliveryCharge,
        packagingCharge: order.packagingCharge,
        discountAmount: order.discountAmount ?? null,
        taxAmount: order.taxAmount,
        tipAmount: order.tipAmount ?? 0,
        totalAmount: order.totalAmount,
        finalAmount: order.finalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      },
      delivery: {
        status: delivery.status,
        estimatedDeliveryMinutes,
        estimatedDeliveryWindow: this.getEstimatedDeliveryWindow(
          order.acceptedAt ?? order.createdAt,
          estimatedDeliveryMinutes,
        ),
        distanceKm,
        nextStop: nextStop?.type ?? null,
        routeDistanceKm,
        routeDurationMinutes,
        airDistanceKm,
        distanceSource,
        latestLocation,
      },
      actions: this.getActions(delivery.status),
    };
  }

  private resolveNextStop(delivery: DeliveryDetailRecord): {
    type: RouteStopType;
    latitude: number;
    longitude: number;
  } | null {
    if (delivery.status === DELIVERY_STATUS.ASSIGNED) {
      return {
        type: 'RESTAURANT',
        latitude: delivery.order.restaurant.latitude,
        longitude: delivery.order.restaurant.longitude,
      };
    }

    if (delivery.status === DELIVERY_STATUS.ON_THE_WAY && delivery.order.address) {
      return {
        type: 'CUSTOMER',
        latitude: delivery.order.address.latitude,
        longitude: delivery.order.address.longitude,
      };
    }

    return null;
  }

  private async resolveRouteMetrics(
    delivery: DeliveryDetailRecord,
    nextStop: {
      type: RouteStopType;
      latitude: number;
      longitude: number;
    } | null,
  ): Promise<RouteDistanceResult | null> {
    if (!nextStop) {
      return null;
    }

    const latestLocation = delivery.trackingLogs[0];
    let originLatitude = latestLocation?.latitude;
    let originLongitude = latestLocation?.longitude;

    if (!originLatitude || !originLongitude) {
      if (delivery.status === DELIVERY_STATUS.ON_THE_WAY) {
        originLatitude = delivery.order.restaurant.latitude;
        originLongitude = delivery.order.restaurant.longitude;
      } else {
        return null;
      }
    }

    return this.routingService.getShortestRoute(
      {
        latitude: originLatitude,
        longitude: originLongitude,
      },
      {
        latitude: nextStop.latitude,
        longitude: nextStop.longitude,
      },
    );
  }

  private resolveAirDistanceKm(
    delivery: DeliveryDetailRecord,
    nextStop: {
      type: RouteStopType;
      latitude: number;
      longitude: number;
    } | null,
    fallbackOrderDistance: number | null,
  ): number | null {
    if (!nextStop) {
      return fallbackOrderDistance;
    }

    const latestLocation = delivery.trackingLogs[0];
    let originLatitude = latestLocation?.latitude;
    let originLongitude = latestLocation?.longitude;

    if (!originLatitude || !originLongitude) {
      if (delivery.status === DELIVERY_STATUS.ON_THE_WAY) {
        originLatitude = delivery.order.restaurant.latitude;
        originLongitude = delivery.order.restaurant.longitude;
      } else {
        return fallbackOrderDistance;
      }
    }

    return this.getDistanceKm(
      originLatitude,
      originLongitude,
      nextStop.latitude,
      nextStop.longitude,
    );
  }

  private mapTrackingRestaurant(restaurant: {
    id: number;
    name: string;
    address: string;
    city: string | null;
    latitude: number;
    longitude: number;
  }): {
    id: number;
    name: string;
    address: string;
    city: string | null;
    latitude: number;
    longitude: number;
  } {
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
    };
  }

  private mapTrackingLog(log: {
    id: number;
    deliveryId: number;
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    recordedAt: Date;
  }): DeliveryTrackingLogDto {
    return {
      id: log.id,
      deliveryId: log.deliveryId,
      latitude: log.latitude,
      longitude: log.longitude,
      speed: log.speed,
      heading: log.heading,
      recordedAt: log.recordedAt,
      source: 'driver',
    };
  }

  private assertDeliveryTransition(
    currentStatus: DeliveryStatusValue,
    nextStatus: DeliveryStatusValue,
  ): void {
    const allowedTransitions: Partial<Record<DeliveryStatusValue, DeliveryStatusValue[]>> = {
      [DELIVERY_STATUS.ON_THE_WAY]: [DELIVERY_STATUS.DELIVERED],
    };

    if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
      throw new BadRequestException(
        `Delivery status cannot change from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private getActions(status: string): DeliveryBoyOrderDetailsDto['actions'] {
    return {
      canAccept: false,
      canMarkOnTheWay: false,
      canMarkDelivered: status === DELIVERY_STATUS.ON_THE_WAY,
    };
  }

  private getEstimatedDeliveryMinutes(order: DeliveryDetailRecord['order']): number {
    const preparationMinutes = order.items
      .map((item) => item.menuItem.preparationTime)
      .filter((value): value is number => typeof value === 'number' && value > 0);
    const maxPrep = preparationMinutes.length > 0 ? Math.max(...preparationMinutes) : 20;
    const deliveryBuffer = order.orderType === 'DELIVERY' ? 25 : 10;

    return Math.min(120, Math.max(15, maxPrep + deliveryBuffer));
  }

  private getEstimatedDeliveryWindow(baseTime: Date, estimatedDeliveryMinutes: number): string {
    const end = new Date(baseTime.getTime() + estimatedDeliveryMinutes * 60 * 1000);
    const start = new Date(end.getTime() - 15 * 60 * 1000);

    return `${this.formatTime(start)} - ${this.formatTime(end)}`;
  }

  private formatTime(value: Date): string {
    return value.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  private formatDateOnly(value: Date | null | undefined): string | null {
    return value ? value.toISOString().slice(0, 10) : null;
  }

  private getMinutesAgo(value: Date): number {
    return Math.max(0, Math.floor((Date.now() - value.getTime()) / 60000));
  }

  private formatAddress(address: {
    address: string;
    city: string | null;
    state: string | null;
  }): string {
    return [address.address, address.city, address.state].filter(Boolean).join(', ');
  }

  private getDistanceKm(
    fromLatitude: number,
    fromLongitude: number,
    toLatitude: number,
    toLongitude: number,
  ): number {
    const earthRadiusKm = 6371;
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const latitudeDelta = toRadians(toLatitude - fromLatitude);
    const longitudeDelta = toRadians(toLongitude - fromLongitude);
    const fromLatitudeRadians = toRadians(fromLatitude);
    const toLatitudeRadians = toRadians(toLatitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(fromLatitudeRadians) *
        Math.cos(toLatitudeRadians) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return Math.round(distance * 10) / 10;
  }

  private hasRole(requester: AuthenticatedUser, role: Role): boolean {
    return requester.role === role;
  }
}
