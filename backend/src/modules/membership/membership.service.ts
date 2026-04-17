import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  getMembership(userId: number) {
    return this.prisma.membership.findMany({
      where: { userId },
      include: {
        tier: true,
      },
    });
  }
}
