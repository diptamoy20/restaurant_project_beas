import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { MenuService } from '../menu/menu.service';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly menuService: MenuService,
  ) {}

  async addFavorite(userId: number, menuItemId: number) {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }

    const exists = await this.prisma.favoriteMenuItem.findUnique({
      where: {
        userId_menuItemId: { userId, menuItemId },
      },
    });

    if (exists) {
      throw new ConflictException('Already added to favorites');
    }

    const favorite = await this.prisma.favoriteMenuItem.create({
      data: { userId, menuItemId },
      include: { menuItem: true },
    });

    // Bust per-user menu cache so next GET /menu reflects isFavorite = true.
    await this.menuService.clearUserMenuCache(menuItem.restaurantId, userId);

    return {
      success: true,
      message: 'Added to favorites',
      data: favorite,
    };
  }

  async getFavorites(userId: number) {
    const favorites = await this.prisma.favoriteMenuItem.findMany({
      where: { userId },
      include: {
        menuItem: {
          include: {
            category: true,
            variants: true,
            addonGroups: {
              include: { options: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      total: favorites.length,
      data: favorites.map((f) => f.menuItem),
    };
  }

  async removeFavorite(userId: number, menuItemId: number) {
    const favorite = await this.prisma.favoriteMenuItem.findUnique({
      where: {
        userId_menuItemId: { userId, menuItemId },
      },
      include: { menuItem: true },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favoriteMenuItem.delete({
      where: { id: favorite.id },
    });

    // Bust per-user menu cache so next GET /menu reflects isFavorite = false.
    await this.menuService.clearUserMenuCache(favorite.menuItem.restaurantId, userId);

    return {
      success: true,
      message: 'Removed from favorites',
    };
  }
}
