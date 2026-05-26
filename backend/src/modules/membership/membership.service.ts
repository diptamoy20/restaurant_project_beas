import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { MembershipResponseDto } from './dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembership(
    userId: number,
    requester: AuthenticatedUser,
  ): Promise<MembershipResponseDto> {
    if (requester.role === Role.CUSTOMER && requester.id !== userId) {
      throw new ForbiddenException('You do not have permission to access this membership');
    }

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
