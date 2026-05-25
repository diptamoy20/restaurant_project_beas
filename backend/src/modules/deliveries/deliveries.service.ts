import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  DeliveryBoyDashboardDto,
  DeliveryBoyOrderCardDto,
  DeliveryBoyOrderDetailsDto,
  DeliveryLocationUpdateResponseDto,
  DeliveryTrackingLogDto,
  DeliveryTrackingResponseDto,
} from './dto';
import { DeliveryBoyOrdersQueryDto } from './dto/delivery-boy-query.dto';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { UpdateMyDeliveryLocationDto } from './dto/update-my-delivery-location.dto';
import { DELIVERY_STATUS, DeliveryStatusValue } from '../../common/constants/delivery-status';
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
type DeliveryCardRecord = Prisma.DeliveryGetPayload<{ include: typeof DELIVERY_CARD_INCLUDE }>;
type DeliveryDetailRecord = Prisma.DeliveryGetPayload<{ include: typeof DELIVERY_DETAIL_INCLUDE }>;

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(requester: AuthenticatedUser): Promise<DeliveryBoyDashboardDto> {
    const agent = await this.getCurrentAgentOrThrow(requester.id);

    const [assigned, onTheWay, delivered, assignedOrders] = await Promise.all([
      this.prisma.delivery.count({
        where: { agentId: agent.id, status: DELIVERY_STATUS.ASSIGNED },
      }),
      this.prisma.delivery.count({
        where: {
          agentId: agent.id,
          status: { in: [DELIVERY_STATUS.OUT_FOR_DELIVERY, DELIVERY_STATUS.ON_THE_WAY] },
        },
      }),
      this.prisma.delivery.count({
        where: { agentId: agent.id, status: DELIVERY_STATUS.DELIVERED },
      }),
      this.prisma.delivery.findMany({
        where: { agentId: agent.id, status: DELIVERY_STATUS.ASSIGNED },
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
      assignedOrders: assignedOrders.map((delivery) => this.mapOrderCard(delivery)),
    };
  }

  async listMyOrders(
    requester: AuthenticatedUser,
    query: DeliveryBoyOrdersQueryDto,
  ): Promise<PaginatedResult<DeliveryBoyOrderCardDto>> {
    const agent = await this.getCurrentAgentOrThrow(requester.id);
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
    const agent = await this.getCurrentAgentOrThrow(requester.id);
    const delivery = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);

    return this.mapOrderDetails(delivery);
  }

  async updateAvailability(
    requester: AuthenticatedUser,
    isAvailable: boolean,
  ): Promise<DeliveryBoyDashboardDto['profile']> {
    const agent = await this.getCurrentAgentOrThrow(requester.id);
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
    const agent = await this.getCurrentAgentOrThrow(requester.id);
    const existing = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);

    if (existing.status !== DELIVERY_STATUS.ASSIGNED) {
      throw new BadRequestException(`Delivery cannot be accepted from status ${existing.status}`);
    }

    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.order.update({
        where: { id: orderId },
        data: {
          status: ORDER_STATUS.OUT_FOR_DELIVERY,
          statusLogs: { create: [{ status: ORDER_STATUS.OUT_FOR_DELIVERY }] },
        },
      });

      return transaction.delivery.update({
        where: { id: existing.id },
        data: { status: DELIVERY_STATUS.OUT_FOR_DELIVERY },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    });

    return this.mapOrderDetails(updated);
  }

  async updateMyOrderStatus(
    requester: AuthenticatedUser,
    orderId: number,
    status: string,
  ): Promise<DeliveryBoyOrderDetailsDto> {
    const agent = await this.getCurrentAgentOrThrow(requester.id);
    const existing = await this.getMyDeliveryByOrderOrThrow(agent.id, orderId);
    const currentStatus = existing.status as DeliveryStatusValue;
    const nextStatus = status as DeliveryStatusValue;

    this.assertDeliveryTransition(currentStatus, nextStatus);

    const updated = await this.prisma.$transaction(async (transaction) => {
      await transaction.order.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          deliveredAt: nextStatus === DELIVERY_STATUS.DELIVERED ? new Date() : undefined,
          statusLogs: { create: [{ status: nextStatus }] },
        },
      });

      return transaction.delivery.update({
        where: { id: existing.id },
        data: { status: nextStatus },
        include: DELIVERY_DETAIL_INCLUDE,
      });
    });

    return this.mapOrderDetails(updated);
  }

  async updateMyLocation(
    requester: AuthenticatedUser,
    payload: UpdateMyDeliveryLocationDto,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    const agent = await this.getCurrentAgentOrThrow(requester.id);
    const delivery = await this.prisma.delivery.findFirst({
      where: { orderId: payload.orderId, agentId: agent.id },
      select: { id: true },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found for this order');
    }

    return this.createTracking(delivery.id, payload);
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
      const agent = await this.getCurrentAgentOrThrow(requester.id);

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
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: {
        agent: true,
        order: true,
        trackingLogs: {
          orderBy: { recordedAt: 'desc' },
          ...toPrismaPagination({ limit: 20, offset: 0 }),
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found for this order');
    }

    if (this.hasRole(requester, Role.CUSTOMER) && delivery.order.userId !== requester.id) {
      throw new ForbiddenException('You do not have permission to access this delivery tracking');
    }

    if (this.hasRole(requester, Role.DELIVERY_BOY)) {
      const agent = await this.getCurrentAgentOrThrow(requester.id);

      if (delivery.agentId !== agent.id) {
        throw new ForbiddenException('You do not have permission to access this delivery tracking');
      }
    }

    return {
      deliveryId: delivery.id,
      status: delivery.status,
      agent: delivery.agent
        ? {
            id: delivery.agent.id,
            name: delivery.agent.name,
            phone: delivery.agent.phone,
            isAvailable: delivery.agent.isAvailable,
          }
        : null,
      order: {
        id: delivery.order.id,
        orderNumber: delivery.order.orderNumber,
        status: delivery.order.status,
        totalAmount: delivery.order.totalAmount,
        paymentStatus: delivery.order.paymentStatus,
      },
      latestLocation: delivery.trackingLogs[0]
        ? this.mapTrackingLog(delivery.trackingLogs[0])
        : null,
      trackingHistory: delivery.trackingLogs.map((log) => this.mapTrackingLog(log)),
    };
  }

  private async getCurrentAgentOrThrow(userId: number): Promise<DeliveryAgentRecord> {
    const agent = await this.prisma.deliveryAgent.findUnique({
      where: { userId },
    });

    if (!agent) {
      throw new NotFoundException('Delivery agent profile not found for current user');
    }

    return agent;
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

  private mapAgent(agent: DeliveryAgentRecord): DeliveryBoyDashboardDto['profile'] {
    return {
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      isAvailable: agent.isAvailable,
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

  private mapOrderDetails(delivery: DeliveryDetailRecord): DeliveryBoyOrderDetailsDto {
    const order = delivery.order;
    const itemCount = order.items.length;
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const estimatedDeliveryMinutes = this.getEstimatedDeliveryMinutes(order);
    const latestLocation = delivery.trackingLogs[0]
      ? this.mapTrackingLog(delivery.trackingLogs[0])
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
        deliveryCharge: 0,
        packagingCharge: 0,
        discountAmount: order.discountAmount ?? null,
        taxAmount: order.taxAmount,
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
        distanceKm:
          order.address && order.restaurant
            ? this.getDistanceKm(
                order.restaurant.latitude,
                order.restaurant.longitude,
                order.address.latitude,
                order.address.longitude,
              )
            : null,
        latestLocation,
      },
      actions: this.getActions(delivery.status),
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
    };
  }

  private assertDeliveryTransition(
    currentStatus: DeliveryStatusValue,
    nextStatus: DeliveryStatusValue,
  ): void {
    const allowedTransitions: Partial<Record<DeliveryStatusValue, DeliveryStatusValue[]>> = {
      [DELIVERY_STATUS.ASSIGNED]: [DELIVERY_STATUS.OUT_FOR_DELIVERY],
      [DELIVERY_STATUS.OUT_FOR_DELIVERY]: [DELIVERY_STATUS.ON_THE_WAY],
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
      canAccept: status === DELIVERY_STATUS.ASSIGNED,
      canMarkOutForDelivery: status === DELIVERY_STATUS.ASSIGNED,
      canMarkOnTheWay: status === DELIVERY_STATUS.OUT_FOR_DELIVERY,
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
    const roles = requester.roles as unknown as Role[] | Role;

    return Array.isArray(roles) ? roles.includes(role) : roles === role;
  }
}
