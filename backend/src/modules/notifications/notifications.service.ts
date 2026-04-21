import { Injectable } from '@nestjs/common';
import { Notification } from '@prisma/client';

import { NotificationResponseDto } from './dto/notification-response.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(userId: number): Promise<NotificationResponseDto[]> {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });

    return notifications.map((notification: Notification) => ({
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
    }));
  }
}
