import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AddressValidationResponseDto, DeliveryQuoteDto } from './dto/location-response.dto';
import { GeoCacheService } from '../../common/cache/geo-cache.service';
import { PrismaService } from '../../prisma/prisma.service';

const GEO_CACHE_TTL_SECONDS = 300;

type NearbyRestaurantRow = {
  id: number;
  name: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  isActive: boolean;
  deliveryRadiusKm: number;
  isLocationEnabled: boolean;
  distanceKm: number;
  deliveryAvailable: boolean;
  deliveryFee: number;
  minimumOrderAmount: number | null;
  estimatedDeliveryTimeMinutes: number;
  availableMenuItemsCount: number;
};

type RestaurantDeliveryRow = {
  restaurantId: number;
  deliveryAvailable: boolean;
  distanceKm: number;
  deliveryFee: number;
  minimumOrderAmount: number | null;
  estimatedDeliveryTimeMinutes: number;
};

type RestaurantExistsRow = {
  id: number;
};

export type NearbyRestaurantWithGeo = NearbyRestaurantRow & {
  categories: {
    id: number;
    restaurantId: number;
    name: string;
    description: string | null;
  }[];
  menuItems: {
    id: number;
    restaurantId: number;
    categoryId: number;
    name: string;
    description: string | null;
    price: number;
    isAvailable: boolean;
    preparationTime: number | null;
  }[];
};

@Injectable()
export class LocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: GeoCacheService,
  ) {}

  async findNearbyRestaurants(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    page: number;
    limit: number;
  }): Promise<NearbyRestaurantWithGeo[]> {
    const cacheKey = this.buildCacheKey('restaurants', params.lat, params.lng, [
      params.radiusKm,
      params.page,
      params.limit,
    ]);
    const cached = await this.cache.get<NearbyRestaurantWithGeo[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const offset = (params.page - 1) * params.limit;
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)`;
    const rows = await this.prisma.$queryRaw<NearbyRestaurantRow[]>(Prisma.sql`
      WITH customer AS (
        SELECT ${point} AS geom, ${point}::geography AS geog
      ),
      restaurant_scope AS (
        SELECT
          r."id",
          r."name",
          r."address",
          r."city",
          r."latitude",
          r."longitude",
          r."is_active" AS "isActive",
          r."delivery_radius_km" AS "deliveryRadiusKm",
          r."is_location_enabled" AS "isLocationEnabled",
          ROUND((ST_Distance(r."location", customer.geog) / 1000)::numeric, 2)::float AS "distanceKm",
          EXISTS (
            SELECT 1
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND ST_Contains(dz."polygon", customer.geom)
          ) AS "zoneContains",
          EXISTS (
            SELECT 1
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
          ) AS "hasDeliveryZones",
          (
            SELECT dz."delivery_fee"
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND ST_Contains(dz."polygon", customer.geom)
            ORDER BY dz."delivery_fee" ASC
            LIMIT 1
          ) AS "zoneDeliveryFee",
          (
            SELECT dz."minimum_order_amount"
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND ST_Contains(dz."polygon", customer.geom)
            ORDER BY dz."delivery_fee" ASC
            LIMIT 1
          ) AS "minimumOrderAmount",
          (
            SELECT COUNT(*)
            FROM "menu_items" mi
            WHERE mi."restaurant_id" = r."id"
              AND mi."is_available" = true
          )::int AS "availableMenuItemsCount"
        FROM "restaurants" r
        CROSS JOIN customer
        WHERE r."is_active" = true
          AND r."is_location_enabled" = true
          AND r."location" IS NOT NULL
          AND ST_DWithin(r."location", customer.geog, ${params.radiusKm * 1000})
      )
      SELECT
        "id",
        "name",
        "address",
        "city",
        "latitude",
        "longitude",
        "isActive",
        "deliveryRadiusKm",
        "isLocationEnabled",
        "distanceKm",
        CASE
          WHEN "hasDeliveryZones" THEN "zoneContains"
          ELSE "distanceKm" <= "deliveryRadiusKm"
        END AS "deliveryAvailable",
        ROUND(COALESCE("zoneDeliveryFee", 20 + ("distanceKm" * 6))::numeric, 2)::float AS "deliveryFee",
        "minimumOrderAmount",
        (20 + CEIL("distanceKm" * 3))::int AS "estimatedDeliveryTimeMinutes",
        "availableMenuItemsCount"
      FROM restaurant_scope
      ORDER BY "distanceKm" ASC, "availableMenuItemsCount" DESC, "name" ASC
      LIMIT ${params.limit}
      OFFSET ${offset}
    `);

    const restaurantIds = rows.map((row) => row.id);
    const [categories, menuItems] =
      restaurantIds.length > 0
        ? await Promise.all([
            this.prisma.category.findMany({
              where: { restaurantId: { in: restaurantIds } },
              orderBy: { name: 'asc' },
            }),
            this.prisma.menuItem.findMany({
              where: {
                restaurantId: { in: restaurantIds },
                isAvailable: true,
              },
              orderBy: [{ restaurantId: 'asc' }, { categoryId: 'asc' }, { name: 'asc' }],
            }),
          ])
        : [[], []];

    const result = rows.map((row) => ({
      ...row,
      categories: categories.filter((category) => category.restaurantId === row.id),
      menuItems: menuItems.filter((menuItem) => menuItem.restaurantId === row.id),
    }));

    await this.cache.set(cacheKey, result, GEO_CACHE_TTL_SECONDS);

    return result;
  }

  async getRestaurantDeliveryQuote(
    restaurantId: number,
    lat: number,
    lng: number,
  ): Promise<DeliveryQuoteDto> {
    const cacheKey = this.buildCacheKey('delivery', lat, lng, [restaurantId]);
    const cached = await this.cache.get<DeliveryQuoteDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const row = await this.getRestaurantDeliveryRow(restaurantId, lat, lng);
    const result: DeliveryQuoteDto = {
      deliveryAvailable: row.deliveryAvailable,
      distanceKm: row.distanceKm,
      deliveryFee: row.deliveryFee,
      estimatedDeliveryTimeMinutes: row.estimatedDeliveryTimeMinutes,
      minimumOrderAmount: row.minimumOrderAmount ?? undefined,
      reason: row.deliveryAvailable
        ? 'Inside delivery area'
        : 'Location is outside this restaurant delivery area',
    };

    await this.cache.set(cacheKey, result, GEO_CACHE_TTL_SECONDS);

    return result;
  }

  async validateAddress(params: {
    lat: number;
    lng: number;
    restaurantId?: number;
  }): Promise<AddressValidationResponseDto> {
    const cacheKey = this.buildCacheKey('address', params.lat, params.lng, [
      params.restaurantId ?? 'all',
    ]);
    const cached = await this.cache.get<AddressValidationResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    if (params.restaurantId) {
      const quote = await this.getRestaurantDeliveryQuote(
        params.restaurantId,
        params.lat,
        params.lng,
      );
      const result = {
        ...quote,
        deliverable: quote.deliveryAvailable,
        restaurantId: params.restaurantId,
      };
      await this.cache.set(cacheKey, result, GEO_CACHE_TTL_SECONDS);
      return result;
    }

    const nearby = await this.findNearbyRestaurants({
      lat: params.lat,
      lng: params.lng,
      radiusKm: 25,
      page: 1,
      limit: 1,
    });
    const first = nearby[0];
    const result: AddressValidationResponseDto = {
      deliverable: Boolean(first?.deliveryAvailable),
      deliveryAvailable: Boolean(first?.deliveryAvailable),
      distanceKm: first?.distanceKm ?? 0,
      deliveryFee: first?.deliveryFee ?? 0,
      estimatedDeliveryTimeMinutes: first?.estimatedDeliveryTimeMinutes ?? 0,
      minimumOrderAmount: first?.minimumOrderAmount ?? undefined,
      restaurantId: first?.id,
      reason: first?.deliveryAvailable
        ? 'At least one restaurant can deliver here'
        : 'No restaurant currently delivers to this location',
    };

    await this.cache.set(cacheKey, result, GEO_CACHE_TTL_SECONDS);

    return result;
  }

  async ensureRestaurantExists(restaurantId: number): Promise<void> {
    const rows = await this.prisma.$queryRaw<RestaurantExistsRow[]>(Prisma.sql`
      SELECT "id"
      FROM "restaurants"
      WHERE "id" = ${restaurantId}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new NotFoundException('Restaurant not found');
    }
  }

  buildMenuCacheKey(restaurantId: number, lat?: number, lng?: number): string {
    if (lat === undefined || lng === undefined) {
      return `menu:${restaurantId}:global`;
    }

    return this.buildCacheKey('menu', lat, lng, [restaurantId]);
  }

  private async getRestaurantDeliveryRow(
    restaurantId: number,
    lat: number,
    lng: number,
  ): Promise<RestaurantDeliveryRow> {
    const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)`;
    const rows = await this.prisma.$queryRaw<RestaurantDeliveryRow[]>(Prisma.sql`
      WITH customer AS (
        SELECT ${point} AS geom, ${point}::geography AS geog
      ),
      restaurant_scope AS (
        SELECT
          r."id" AS "restaurantId",
          r."delivery_radius_km" AS "deliveryRadiusKm",
          ROUND((ST_Distance(r."location", customer.geog) / 1000)::numeric, 2)::float AS "distanceKm",
          EXISTS (
            SELECT 1
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND ST_Contains(dz."polygon", customer.geom)
          ) AS "zoneContains",
          EXISTS (
            SELECT 1
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
          ) AS "hasDeliveryZones",
          (
            SELECT dz."delivery_fee"
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND ST_Contains(dz."polygon", customer.geom)
            ORDER BY dz."delivery_fee" ASC
            LIMIT 1
          ) AS "zoneDeliveryFee",
          (
            SELECT dz."minimum_order_amount"
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND ST_Contains(dz."polygon", customer.geom)
            ORDER BY dz."delivery_fee" ASC
            LIMIT 1
          ) AS "minimumOrderAmount"
        FROM "restaurants" r
        CROSS JOIN customer
        WHERE r."id" = ${restaurantId}
          AND r."is_active" = true
          AND r."is_location_enabled" = true
          AND r."location" IS NOT NULL
        LIMIT 1
      )
      SELECT
        "restaurantId",
        CASE
          WHEN "hasDeliveryZones" THEN "zoneContains"
          ELSE "distanceKm" <= "deliveryRadiusKm"
        END AS "deliveryAvailable",
        "distanceKm",
        ROUND(COALESCE("zoneDeliveryFee", 20 + ("distanceKm" * 6))::numeric, 2)::float AS "deliveryFee",
        "minimumOrderAmount",
        (20 + CEIL("distanceKm" * 3))::int AS "estimatedDeliveryTimeMinutes"
      FROM restaurant_scope
    `);

    if (!rows[0]) {
      await this.ensureRestaurantExists(restaurantId);
      throw new NotFoundException('Restaurant is not enabled for location delivery');
    }

    return rows[0];
  }

  private buildCacheKey(
    prefix: string,
    lat: number,
    lng: number,
    parts: (string | number)[],
  ): string {
    const normalizedLat = lat.toFixed(4);
    const normalizedLng = lng.toFixed(4);
    return `${prefix}:${normalizedLat}:${normalizedLng}:${parts.join(':')}`;
  }
}
