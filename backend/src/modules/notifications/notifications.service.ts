import { ForbiddenException, Injectable } from '@nestjs/common';

import { NotificationResponseDto } from './dto/notification-response.dto';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(
    userId: number,
    requester: AuthenticatedUser,
    query?: { offset?: number; limit?: number },
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    const canReadOnlyOwn =
      requester.roles.includes(Role.CUSTOMER) || requester.roles.includes(Role.DELIVERY_BOY);

    if (canReadOnlyOwn && requester.id !== userId) {
      throw new ForbiddenException('You do not have permission to access these notifications');
    }

    const pagination = normalizePagination(query, { limit: 20, maxLimit: 50 });
    const where = { userId };
    const [total, notifications] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({
        where,
        orderBy: { id: 'desc' },
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: notifications.map((notification) => ({
        id: notification.id,
        userId: notification.userId,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
      })),
      ...buildPaginationMeta(total, pagination),
    };
  }
}
