import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { CreateAdminMenuItemDto, UpdateAdminMenuItemDto } from './dto/admin-menu-item.dto';
import {
  MenuCategoryGroupDto,
  MenuItemDto,
  MenuResponseDto,
  MenuRestaurantSummaryDto,
} from './dto';
import { GeoCacheService } from '../../common/cache/geo-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';

const MENU_CACHE_TTL_SECONDS = 300;

type MenuItemRow = Prisma.MenuItemGetPayload<{
  include: { category: true; variants: true };
}>;

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly cache: GeoCacheService,
  ) {}

  async getMenuByRestaurant(
    restaurantId: number,
    coordinates?: { lat: number; lng: number },
  ): Promise<MenuResponseDto> {
    const cacheKey = this.locationService.buildMenuCacheKey(
      restaurantId,
      coordinates?.lat,
      coordinates?.lng,
    );
    const cached = await this.cache.get<MenuResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    await this.locationService.ensureRestaurantExists(restaurantId);

    const [restaurant, items] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      }),
      this.prisma.menuItem.findMany({
        where: {
          restaurantId,
          isAvailable: true,
        },
        include: {
          category: true,
          variants: true,
        },
        orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const delivery = coordinates
      ? await this.locationService.getRestaurantDeliveryQuote(
          restaurantId,
          coordinates.lat,
          coordinates.lng,
        )
      : undefined;

    const mappedItems = items.map((item) => this.mapMenuItem(item));
    const categories = this.groupItemsByCategory(mappedItems);

    const response: MenuResponseDto = {
      restaurantId,
      restaurant: restaurant
        ? this.mapRestaurantSummary(restaurant)
        : undefined,
      categories,
      items: mappedItems,
      deliveryAvailable: delivery?.deliveryAvailable,
      distanceKm: delivery?.distanceKm,
      estimatedDeliveryTimeMinutes: delivery?.estimatedDeliveryTimeMinutes,
      deliveryFee: delivery?.deliveryFee,
      delivery,
    };

    await this.cache.set(cacheKey, response, MENU_CACHE_TTL_SECONDS);

    return response;
  }

  async getBestSellingItems(params?: {
    lat?: number;
    lng?: number;
    limit?: number;
  }): Promise<
    (MenuItemDto & {
      restaurant: MenuRestaurantSummaryDto;
    })[]
  > {
    const take = Math.min(params?.limit ?? 24, 48);

    const items = await this.prisma.menuItem.findMany({
      where: {
        isBestSelling: true,
        isAvailable: true,
      },
      include: {
        category: true,
        variants: true,
        restaurant: true,
      },
      orderBy: [{ popularityScore: 'desc' }, { id: 'desc' }],
      take,
    });

    let ordered = [...items];

    if (
      params?.lat !== undefined &&
      params?.lng !== undefined &&
      Number.isFinite(params.lat) &&
      Number.isFinite(params.lng)
    ) {
      ordered.sort(
        (a, b) =>
          this.haversineKm(params.lat!, params.lng!, a.restaurant) -
          this.haversineKm(params.lat!, params.lng!, b.restaurant),
      );
    }

    return ordered.map((item) => ({
      ...this.mapMenuItem(item),
      restaurant: this.mapRestaurantSummary(item.restaurant),
    }));
  }

  async getAdminMenuForRestaurant(restaurantId: number): Promise<MenuResponseDto> {
    await this.locationService.ensureRestaurantExists(restaurantId);

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    const items = await this.prisma.menuItem.findMany({
      where: { restaurantId },
      include: {
        category: true,
        variants: true,
      },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });

    const mappedItems = items.map((item) => this.mapMenuItem(item));

    return {
      restaurantId,
      restaurant: restaurant ? this.mapRestaurantSummary(restaurant) : undefined,
      categories: this.groupItemsByCategory(mappedItems),
      items: mappedItems,
    };
  }

  async createAdminMenuItem(
    restaurantId: number,
    dto: CreateAdminMenuItemDto,
  ): Promise<MenuItemDto> {
    await this.locationService.ensureRestaurantExists(restaurantId);

    const duplicate = await this.prisma.menuItem.findFirst({
      where: {
        restaurantId,
        name: { equals: dto.name.trim(), mode: 'insensitive' },
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        'A menu item with this name already exists for this restaurant',
      );
    }

    const categoryId = await this.resolveCategoryId(restaurantId, dto);

    const created = await this.prisma.menuItem.create({
      data: {
        restaurantId,
        categoryId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        price: dto.price,
        discountPrice: dto.discountPrice ?? null,
        imageUrl: dto.imageUrl?.trim() || null,
        foodType: dto.foodType ?? 'VEG',
        spicyLevel: dto.spicyLevel ?? null,
        ingredients: dto.ingredients?.trim() || null,
        isAvailable: dto.isAvailable ?? true,
        isBestSelling: dto.isBestSelling ?? false,
        popularityScore: dto.popularityScore ?? 0,
        rating: dto.rating ?? null,
        preparationTime: dto.preparationTime ?? null,
        customizableOptions:
          dto.customizableOptions === undefined
            ? undefined
            : (dto.customizableOptions as Prisma.InputJsonValue),
      },
      include: { category: true, variants: true },
    });

    return this.mapMenuItem(created);
  }

  async updateAdminMenuItem(
    menuItemId: number,
    dto: UpdateAdminMenuItemDto,
  ): Promise<MenuItemDto> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      include: { category: true },
    });

    if (!existing) {
      throw new NotFoundException('Menu item not found');
    }

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.prisma.menuItem.findFirst({
        where: {
          restaurantId: existing.restaurantId,
          id: { not: menuItemId },
          name: { equals: dto.name.trim(), mode: 'insensitive' },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'A menu item with this name already exists for this restaurant',
        );
      }
    }

    let categoryId = existing.categoryId;

    if (dto.categoryId !== undefined || dto.categoryName !== undefined) {
      categoryId = await this.resolveCategoryId(existing.restaurantId, {
        categoryId: dto.categoryId,
        categoryName: dto.categoryName,
      } as CreateAdminMenuItemDto);
    }

    const updated = await this.prisma.menuItem.update({
      where: { id: menuItemId },
      data: {
        name: dto.name?.trim(),
        description:
          dto.description === undefined ? undefined : dto.description?.trim() || null,
        price: dto.price,
        discountPrice:
          dto.discountPrice === undefined ? undefined : dto.discountPrice,
        imageUrl:
          dto.imageUrl === undefined ? undefined : dto.imageUrl?.trim() || null,
        foodType: dto.foodType,
        spicyLevel:
          dto.spicyLevel === undefined ? undefined : dto.spicyLevel,
        ingredients:
          dto.ingredients === undefined ? undefined : dto.ingredients?.trim() || null,
        isAvailable: dto.isAvailable,
        isBestSelling: dto.isBestSelling,
        popularityScore: dto.popularityScore,
        rating: dto.rating,
        preparationTime: dto.preparationTime,
        categoryId,
        customizableOptions:
          dto.customizableOptions === undefined
            ? undefined
            : (dto.customizableOptions as Prisma.InputJsonValue),
      },
      include: { category: true, variants: true },
    });

    return this.mapMenuItem(updated);
  }

  async deleteAdminMenuItem(menuItemId: number): Promise<{ ok: boolean }> {
    const existing = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
    });

    if (!existing) {
      throw new NotFoundException('Menu item not found');
    }

    const ordersUsingItem = await this.prisma.orderItem.count({
      where: { menuItemId },
    });

    if (ordersUsingItem > 0) {
      throw new BadRequestException(
        'Cannot delete a menu item that appears on past orders',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { menuItemId } });
      await tx.menuItemVariant.deleteMany({ where: { menuItemId } });
      await tx.menuItem.delete({ where: { id: menuItemId } });
    });

    return { ok: true };
  }

  private async resolveCategoryId(
    restaurantId: number,
    dto: Pick<CreateAdminMenuItemDto, 'categoryId' | 'categoryName'>,
  ): Promise<number> {
    if (dto.categoryId !== undefined) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, restaurantId },
      });

      if (!category) {
        throw new BadRequestException('categoryId is not valid for this restaurant');
      }

      return category.id;
    }

    if (dto.categoryName?.trim()) {
      const name = dto.categoryName.trim();

      const existing = await this.prisma.category.findFirst({
        where: {
          restaurantId,
          name: { equals: name, mode: 'insensitive' },
        },
      });

      if (existing) {
        return existing.id;
      }

      const created = await this.prisma.category.create({
        data: {
          restaurantId,
          name,
        },
      });

      return created.id;
    }

    throw new BadRequestException('Either categoryId or categoryName is required');
  }

  private mapRestaurantSummary(restaurant: {
    id: number;
    name: string;
    address: string;
    city: string | null;
    imageUrl: string | null;
  }): MenuRestaurantSummaryDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      imageUrl: restaurant.imageUrl,
    };
  }

  private mapMenuItem(item: MenuItemRow): MenuItemDto {
    return {
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
      variants: item.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.price,
      })),
      imageUrl: item.imageUrl,
      discountPrice: item.discountPrice,
      foodType: item.foodType,
      spicyLevel: item.spicyLevel,
      rating: item.rating,
      isBestSelling: item.isBestSelling,
      preparationTime: item.preparationTime,
    };
  }

  private groupItemsByCategory(items: MenuItemDto[]): MenuCategoryGroupDto[] {
    const map = new Map<string, MenuItemDto[]>();

    for (const item of items) {
      const label = item.category?.name || 'Other';
      const bucket = map.get(label) ?? [];
      bucket.push(item);
      map.set(label, bucket);
    }

    return [...map.entries()].map(([name, groupItems]) => ({
      name,
      items: groupItems,
    }));
  }

  private haversineKm(
    lat: number,
    lng: number,
    restaurant: { latitude: number; longitude: number },
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(restaurant.latitude - lat);
    const dLon = this.deg2rad(restaurant.longitude - lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat)) *
        Math.cos(this.deg2rad(restaurant.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
