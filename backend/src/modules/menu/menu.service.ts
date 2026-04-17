import { Injectable } from '@nestjs/common';

import { MenuResponseDto } from './dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  async getMenuByRestaurant(restaurantId: number): Promise<MenuResponseDto> {
    const items = await this.prisma.menuItem.findMany({
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

    // ✅ infer type safely from Prisma result
    type Item = (typeof items)[number];
    type Variant = Item['variants'][number];

    return {
      restaurantId,
      items: items.map((item: Item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        isAvailable: item.isAvailable,
        restaurantId: item.restaurantId,
        categoryId: item.categoryId,
        category: {
          id: item.category.id,
          name: item.category.name,
        },
        variants: item.variants.map((v: Variant) => ({
          id: v.id,
          name: v.name,
          price: v.price,
        })),
      })),
    };
  }
}
