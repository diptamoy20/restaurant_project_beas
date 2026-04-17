import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  getNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });
  }
}

