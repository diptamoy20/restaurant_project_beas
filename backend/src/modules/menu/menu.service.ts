import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  MenuCategoryGroupDto,
  MenuItemDto,
  MenuResponseDto,
  MenuRestaurantSummaryDto,
} from './dto';
import {
  AdminCategoryDto,
  CreateAdminCategoryDto,
  UpdateAdminCategoryDto,
} from './dto/admin-category.dto';
import { CreateAdminMenuItemDto, UpdateAdminMenuItemDto } from './dto/admin-menu-item.dto';
import { GeoCacheService } from '../../common/cache/geo-cache.service';
import {
  buildPaginationMeta,
  normalizePagination,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';

const MENU_CACHE_TTL_SECONDS = 300;
const FREQUENT_ITEM_LIMIT = 10;
const MIN_PERSONAL_ORDER_SESSIONS = 2;

const MENU_ITEM_INCLUDE = {
  category: true,
  variants: true,
  addonGroups: {
    where: { isActive: true },
    include: {
      options: {
        where: { isAvailable: true },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.MenuItemInclude;

const ADMIN_MENU_ITEM_INCLUDE = {
  category: true,
  variants: true,
  addonGroups: {
    include: {
      options: {
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.MenuItemInclude;

type MenuItemRow = Prisma.MenuItemGetPayload<{
  include: typeof ADMIN_MENU_ITEM_INCLUDE;
}>;

type MenuQueryOptions = {
  coordinates?: { lat: number; lng: number };
  categoryId?: number;
  limit?: number;
  offset?: number;
};

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly cache: GeoCacheService,
  ) {}

  async getMenuByRestaurant(
    restaurantId: number,
    options: MenuQueryOptions = {},
  ): Promise<MenuResponseDto> {
    const pagination = normalizePagination(options, { limit: 20, maxLimit: 50 });
    const cacheKey = this.locationService.buildMenuCacheKey(
      restaurantId,
      options.coordinates?.lat,
      options.coordinates?.lng,
      [options.categoryId ?? 'all', pagination.limit, pagination.offset],
    );
    const cached = await this.cache.get<MenuResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    await this.locationService.ensureRestaurantExists(restaurantId);

    const where = this.buildMenuWhere(restaurantId, options.categoryId);

    const categoryWhere = this.buildCategoryWhere(restaurantId, options.categoryId);

    const [restaurant, categoryRows, items] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      }),
      this.prisma.category.findMany({
        where: categoryWhere,
        orderBy: { name: 'asc' },
      }),
      this.prisma.menuItem.findMany({
        where,
        include: {
          ...MENU_ITEM_INCLUDE,
        },
        orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
        ...toPrismaPagination(pagination),
      }),
    ]);
    const total = await this.prisma.menuItem.count({ where });

    const delivery = options.coordinates
      ? await this.locationService.getRestaurantDeliveryQuote(
          restaurantId,
          options.coordinates.lat,
          options.coordinates.lng,
        )
      : undefined;

    const mappedItems = items.map((item) => this.mapMenuItem(item));
    const categories = this.mapMenuCategories(categoryRows, mappedItems);

    const response: MenuResponseDto = {
      restaurantId,
      restaurant: restaurant ? this.mapRestaurantSummary(restaurant) : undefined,
      categories,
      items: mappedItems,
      pagination: buildPaginationMeta(total, pagination),
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
    categoryId?: number;
    restaurantId?: number;
  }): Promise<
    (MenuItemDto & {
      restaurant: MenuRestaurantSummaryDto;
    })[]
  > {
    const limit = Math.min(params?.limit ?? 24, 48);
    const where: Prisma.MenuItemWhereInput = {
      isBestSelling: true,
      isAvailable: true,
      ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params?.restaurantId ? { restaurantId: params.restaurantId } : {}),
    };

    const items = await this.prisma.menuItem.findMany({
      where,
      include: {
        category: true,
        variants: true,
        restaurant: true,
        addonGroups: {
          where: { isActive: true },
          include: {
            options: {
              where: { isAvailable: true },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
      orderBy: [{ popularityScore: 'desc' }, { id: 'desc' }],
      ...toPrismaPagination({ limit, offset: 0 }),
    });

    const ordered = [...items];

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

    const [restaurant, categoryRows, items] = await Promise.all([
      this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      }),
      this.prisma.category.findMany({
        where: { restaurantId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.menuItem.findMany({
        where: { restaurantId },
        include: {
          ...ADMIN_MENU_ITEM_INCLUDE,
        },
        orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
      }),
    ]);

    const mappedItems = items.map((item) => this.mapMenuItem(item));

    return {
      restaurantId,
      restaurant: restaurant ? this.mapRestaurantSummary(restaurant) : undefined,
      categories: this.mapMenuCategories(categoryRows, mappedItems),
      items: mappedItems,
    };
  }

  async getFrequentItems(restaurantId: number, userId?: number): Promise<MenuItemDto[]> {
    if (!userId) {
      return this.getRestaurantPopularItems(restaurantId);
    }

    const recommendations = await this.prisma.$queryRaw<
      {
        menuItemId: number;
        recommendationScore: number;
        distinctOrderCount: number;
      }[]
    >`
      WITH user_order_items AS (
        SELECT
          oi."menu_item_id" AS "menuItemId",
          oi."quantity",
          o."id" AS "orderId",
          o."created_at" AS "createdAt"
        FROM "orders" o
        INNER JOIN "order_items" oi ON oi."order_id" = o."id"
        INNER JOIN "menu_items" mi ON mi."id" = oi."menu_item_id"
        WHERE
          o."user_id" = ${userId}
          AND o."restaurant_id" = ${restaurantId}
          AND o."status" NOT IN ('CANCELLED', 'REJECTED')
          AND mi."restaurant_id" = ${restaurantId}
          AND mi."is_available" = true
      ),
      item_habits AS (
        SELECT
          "menuItemId",
          SUM("quantity")::int AS "totalOrderCount",
          COUNT(DISTINCT "orderId")::int AS "distinctOrderCount",
          COUNT(DISTINCT DATE_TRUNC('week', "createdAt"))::int AS "activeWeeks",
          SUM(
            CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN "quantity" ELSE 0 END
          )::int AS "recentOrderCount",
          MAX("createdAt") AS "latestOrderedAt"
        FROM user_order_items
        GROUP BY "menuItemId"
      )
      SELECT
        "menuItemId",
        "distinctOrderCount",
        (
          ("totalOrderCount" * 10)
          + ("recentOrderCount" * 20)
          + (LEAST("distinctOrderCount", 8) * 12)
          + (LEAST("activeWeeks", 6) * 8)
          + CASE
              WHEN "latestOrderedAt" >= NOW() - INTERVAL '7 days' THEN 30
              WHEN "latestOrderedAt" >= NOW() - INTERVAL '30 days' THEN 15
              WHEN "latestOrderedAt" >= NOW() - INTERVAL '90 days' THEN 5
              ELSE 0
            END
        )::float AS "recommendationScore"
      FROM item_habits
      WHERE "totalOrderCount" >= 2 OR "distinctOrderCount" >= 2
      ORDER BY "recommendationScore" DESC, "distinctOrderCount" DESC, "latestOrderedAt" DESC
      LIMIT ${FREQUENT_ITEM_LIMIT};
    `;

    const hasEnoughHistory =
      recommendations.reduce((total, item) => total + item.distinctOrderCount, 0) >=
      MIN_PERSONAL_ORDER_SESSIONS;
    const sortedMenuItemIds = recommendations.map((item) => item.menuItemId);

    if (!hasEnoughHistory || sortedMenuItemIds.length === 0) {
      return this.getRestaurantPopularItems(restaurantId);
    }

    const items = await this.findAvailableMenuItemsByIds(restaurantId, sortedMenuItemIds);

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const result: MenuItemDto[] = [];
    for (const id of sortedMenuItemIds) {
      const item = itemMap.get(id);
      if (item) {
        result.push(this.mapMenuItem(item));
      }
    }

    return result;
  }

  private async getRestaurantPopularItems(restaurantId: number): Promise<MenuItemDto[]> {
    const items = await this.prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
      },
      include: {
        ...MENU_ITEM_INCLUDE,
      },
      orderBy: [
        { isBestSelling: 'desc' },
        { popularityScore: 'desc' },
        { rating: 'desc' },
        { id: 'desc' },
      ],
      take: FREQUENT_ITEM_LIMIT,
    });

    return items.map((item) => this.mapMenuItem(item));
  }

  private findAvailableMenuItemsByIds(
    restaurantId: number,
    menuItemIds: number[],
  ): Promise<MenuItemRow[]> {
    return this.prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
        isAvailable: true,
      },
      include: {
        ...MENU_ITEM_INCLUDE,
      },
    });
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
        addonGroups: dto.addonGroups?.length
          ? {
              create: dto.addonGroups.map((group, groupIndex) => ({
                restaurantId,
                name: group.name.trim(),
                selectionType: group.selectionType,
                isRequired: group.isRequired ?? false,
                minSelect: group.minSelect ?? null,
                maxSelect: group.maxSelect ?? null,
                sortOrder: group.sortOrder ?? groupIndex,
                isActive: group.isActive ?? true,
                options: {
                  create: group.options.map((option, optionIndex) => ({
                    name: option.name.trim(),
                    price: option.price,
                    isAvailable: option.isAvailable ?? true,
                    sortOrder: option.sortOrder ?? optionIndex,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: ADMIN_MENU_ITEM_INCLUDE,
    });

    await this.clearMenuCache(restaurantId);

    return this.mapMenuItem(created);
  }

  async getAdminCategoriesForRestaurant(restaurantId: number): Promise<AdminCategoryDto[]> {
    await this.locationService.ensureRestaurantExists(restaurantId);

    const categories = await this.prisma.category.findMany({
      where: { restaurantId },
      include: {
        menuItems: {
          select: { isAvailable: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => this.mapAdminCategory(category));
  }

  async createAdminCategory(
    restaurantId: number,
    dto: CreateAdminCategoryDto,
  ): Promise<AdminCategoryDto> {
    await this.locationService.ensureRestaurantExists(restaurantId);

    const name = dto.name.trim();
    const duplicate = await this.prisma.category.findFirst({
      where: {
        restaurantId,
        name: { equals: name, mode: 'insensitive' },
      },
    });

    if (duplicate) {
      throw new BadRequestException('A category with this name already exists for this restaurant');
    }

    const created = await this.prisma.category.create({
      data: {
        restaurantId,
        name,
        description: dto.description?.trim() || null,
      },
      include: {
        menuItems: {
          select: { isAvailable: true },
        },
      },
    });

    await this.clearMenuCache(restaurantId);

    return this.mapAdminCategory(created);
  }

  async updateAdminCategory(
    categoryId: number,
    dto: UpdateAdminCategoryDto,
  ): Promise<AdminCategoryDto> {
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name && dto.name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          restaurantId: existing.restaurantId,
          id: { not: categoryId },
          name: { equals: dto.name.trim(), mode: 'insensitive' },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          'A category with this name already exists for this restaurant',
        );
      }
    }

    const updated = await this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name?.trim(),
        description: dto.description === undefined ? undefined : dto.description?.trim() || null,
      },
      include: {
        menuItems: {
          select: { isAvailable: true },
        },
      },
    });

    await this.clearMenuCache(existing.restaurantId);

    return this.mapAdminCategory(updated);
  }

  async deleteAdminCategory(categoryId: number): Promise<{ ok: boolean }> {
    const existing = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        menuItems: {
          select: { id: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    if (existing.menuItems.length > 0) {
      throw new BadRequestException('Cannot delete a category that has menu items');
    }

    await this.prisma.category.delete({ where: { id: categoryId } });
    await this.clearMenuCache(existing.restaurantId);

    return { ok: true };
  }

  async updateAdminMenuItem(menuItemId: number, dto: UpdateAdminMenuItemDto): Promise<MenuItemDto> {
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.update({
        where: { id: menuItemId },
        data: {
          name: dto.name?.trim(),
          description: dto.description === undefined ? undefined : dto.description?.trim() || null,
          price: dto.price,
          discountPrice: dto.discountPrice === undefined ? undefined : dto.discountPrice,
          imageUrl: dto.imageUrl === undefined ? undefined : dto.imageUrl?.trim() || null,
          foodType: dto.foodType,
          spicyLevel: dto.spicyLevel === undefined ? undefined : dto.spicyLevel,
          ingredients: dto.ingredients === undefined ? undefined : dto.ingredients?.trim() || null,
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
      });

      if (dto.addonGroups !== undefined) {
        await tx.addonGroup.deleteMany({ where: { menuItemId } });

        if (dto.addonGroups.length > 0) {
          await Promise.all(
            dto.addonGroups.map((group, groupIndex) =>
              tx.addonGroup.create({
                data: {
                  menuItemId,
                  restaurantId: existing.restaurantId,
                  name: group.name.trim(),
                  selectionType: group.selectionType,
                  isRequired: group.isRequired ?? false,
                  minSelect: group.minSelect ?? null,
                  maxSelect: group.maxSelect ?? null,
                  sortOrder: group.sortOrder ?? groupIndex,
                  isActive: group.isActive ?? true,
                  options: {
                    create: group.options.map((option, optionIndex) => ({
                      name: option.name.trim(),
                      price: option.price,
                      isAvailable: option.isAvailable ?? true,
                      sortOrder: option.sortOrder ?? optionIndex,
                    })),
                  },
                },
              }),
            ),
          );
        }
      }

      return tx.menuItem.findUniqueOrThrow({
        where: { id: item.id },
        include: ADMIN_MENU_ITEM_INCLUDE,
      });
    });

    await this.clearMenuCache(existing.restaurantId);

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
      throw new BadRequestException('Cannot delete a menu item that appears on past orders');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { menuItemId } });
      await tx.menuItemVariant.deleteMany({ where: { menuItemId } });
      await tx.menuItem.delete({ where: { id: menuItemId } });
    });

    await this.clearMenuCache(existing.restaurantId);

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

  private buildMenuWhere(restaurantId: number, categoryId?: number): Prisma.MenuItemWhereInput {
    const where: Prisma.MenuItemWhereInput = {
      restaurantId,
      isAvailable: true,
    };

    if (categoryId === undefined) {
      return where;
    }

    return {
      ...where,
      categoryId,
    };
  }

  private buildCategoryWhere(restaurantId: number, categoryId?: number): Prisma.CategoryWhereInput {
    return {
      restaurantId,
      ...(categoryId !== undefined ? { id: categoryId } : {}),
    };
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
      addonGroups: item.addonGroups.map((group) => ({
        id: group.id,
        name: group.name,
        selectionType: group.selectionType,
        isRequired: group.isRequired,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        sortOrder: group.sortOrder,
        options: group.options.map((option) => ({
          id: option.id,
          name: option.name,
          price: option.price,
          isAvailable: option.isAvailable,
          sortOrder: option.sortOrder,
        })),
      })),
      imageUrl: item.imageUrl,
      description: item.description,
      ingredients: item.ingredients,
      discountPrice: item.discountPrice,
      foodType: item.foodType,
      spicyLevel: item.spicyLevel,
      rating: item.rating,
      isBestSelling: item.isBestSelling,
      preparationTime: item.preparationTime,
    };
  }

  private mapAdminCategory(category: {
    id: number;
    restaurantId: number;
    name: string;
    description: string | null;
    menuItems: { isAvailable: boolean }[];
  }): AdminCategoryDto {
    return {
      id: category.id,
      restaurantId: category.restaurantId,
      name: category.name,
      description: category.description,
      activeItemCount: category.menuItems.filter((item) => item.isAvailable).length,
      totalItemCount: category.menuItems.length,
    };
  }

  private async clearMenuCache(restaurantId: number): Promise<void> {
    const globalKey = this.locationService.buildMenuCacheKey(restaurantId);

    this.cache.deleteMatching(
      (key) =>
        key === globalKey ||
        key.startsWith(`menu:${restaurantId}:`) ||
        (key.startsWith('menu:') && key.includes(`:${restaurantId}:`)),
    );
    await this.cache.delete(globalKey);
  }

  private mapMenuCategories(
    categories: {
      id: number;
      restaurantId: number;
      name: string;
      description: string | null;
    }[],
    items: MenuItemDto[],
  ): MenuCategoryGroupDto[] {
    return categories.map((category) => ({
      id: category.id,
      restaurantId: category.restaurantId,
      name: category.name,
      description: category.description,
      items: items.filter((item) => item.categoryId === category.id),
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
