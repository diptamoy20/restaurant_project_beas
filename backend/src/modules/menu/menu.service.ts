import { Injectable } from '@nestjs/common';

import { MenuResponseDto } from './dto';
import { GeoCacheService } from '../../common/cache/geo-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';

const MENU_CACHE_TTL_SECONDS = 300;

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

    const delivery = coordinates
      ? await this.locationService.getRestaurantDeliveryQuote(
          restaurantId,
          coordinates.lat,
          coordinates.lng,
        )
      : undefined;

    const response: MenuResponseDto = {
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
      deliveryAvailable: delivery?.deliveryAvailable,
      distanceKm: delivery?.distanceKm,
      estimatedDeliveryTimeMinutes: delivery?.estimatedDeliveryTimeMinutes,
      deliveryFee: delivery?.deliveryFee,
      delivery,
    };

    await this.cache.set(cacheKey, response, MENU_CACHE_TTL_SECONDS);

    return response;
  }
}
