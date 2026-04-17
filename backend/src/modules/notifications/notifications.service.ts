import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getNotifications(userId: number): Promise<any> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });
  }
}
