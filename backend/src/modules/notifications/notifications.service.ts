import { ForbiddenException, Injectable } from '@nestjs/common';

import { NotificationResponseDto } from './dto/notification-response.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(
    userId: number,
    requester: AuthenticatedUser,
  ): Promise<NotificationResponseDto[]> {
    const canReadOnlyOwn =
      requester.roles.includes(Role.CUSTOMER) || requester.roles.includes(Role.DELIVERY_BOY);

    if (canReadOnlyOwn && requester.id !== userId) {
      throw new ForbiddenException('You do not have permission to access these notifications');
    }

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
