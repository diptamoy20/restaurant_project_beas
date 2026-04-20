import { Injectable, NotFoundException } from '@nestjs/common';

import { MembershipResponseDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembership(userId: number): Promise<MembershipResponseDto> {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      include: {
        tier: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return {
      id: membership.id,
      userId: membership.userId,
      tier: {
        id: membership.tier.id,
        name: membership.tier.name,
      },
    };
  }
}
