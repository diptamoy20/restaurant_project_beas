import { Injectable, NotFoundException } from '@nestjs/common';

import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveriesService {
  constructor(private readonly prisma: PrismaService) {}

  async updateDeliveryLocation(payload: UpdateDeliveryLocationDto) {
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
      tracking,
    };
  }

  async getTrackingByOrder(orderId: number) {
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
      agent: delivery.agent,
      orderNumber: delivery.order.orderNumber,
      latestLocation: delivery.trackingLogs[0] ?? null,
      trackingHistory: delivery.trackingLogs,
    };
  }
}
