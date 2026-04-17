import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  getMenuByRestaurant(restaurantId: number) {
    return this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        category: true,
        variants: true,
      },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });
  }
}
