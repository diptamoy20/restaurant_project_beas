import { Injectable, NotFoundException } from '@nestjs/common';

import { DeliveryLocationUpdateResponseDto, DeliveryTrackingResponseDto } from './dto';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async updateDeliveryLocation(
    payload: UpdateDeliveryLocationDto,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: payload.deliveryId },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    const tracking = await this.prisma.deliveryTracking.create({
      data: {
        deliveryId: payload.deliveryId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        speed: payload.speed,
        heading: payload.heading,
      },
    });

    return {
      message: 'Delivery location updated',
      tracking: {
        id: tracking.id,
        deliveryId: tracking.deliveryId,
        latitude: tracking.latitude,
        longitude: tracking.longitude,
        speed: tracking.speed,
        heading: tracking.heading,
        recordedAt: tracking.recordedAt,
      },
    };
  }

  async getTrackingByOrder(orderId: number): Promise<DeliveryTrackingResponseDto> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { orderId },
      include: {
        agent: true,
        order: true,
        trackingLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found for this order');
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
        ? {
            id: delivery.trackingLogs[0].id,
            deliveryId: delivery.trackingLogs[0].deliveryId,
            latitude: delivery.trackingLogs[0].latitude,
            longitude: delivery.trackingLogs[0].longitude,
            speed: delivery.trackingLogs[0].speed,
            heading: delivery.trackingLogs[0].heading,
            recordedAt: delivery.trackingLogs[0].recordedAt,
          }
        : null,
      trackingHistory: delivery.trackingLogs.map((log: (typeof delivery.trackingLogs)[0]) => ({
        id: log.id,
        deliveryId: log.deliveryId,
        latitude: log.latitude,
        longitude: log.longitude,
        speed: log.speed,
        heading: log.heading,
        recordedAt: log.recordedAt,
      })),
    };
  }
}
