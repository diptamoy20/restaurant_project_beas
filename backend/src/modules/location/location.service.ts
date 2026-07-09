import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { AddressValidationResponseDto, DeliveryQuoteDto } from './dto/location-response.dto';
import { GeoCacheService } from '../../common/cache/geo-cache.service';
import { RoutingService } from '../../common/routing/routing.service';
import { calculateDeliveryFee, DeliveryFeeBreakdown } from '../../common/utils/delivery-fee.util';
import { PrismaService } from '../../prisma/prisma.service';

const GEO_CACHE_TTL_SECONDS = 300;

type RestaurantRouteData = {
  drivingDistanceKm: number;
  estimatedDurationMinutes: number | null;
  routeSource: 'OSRM' | 'AIR_DISTANCE_FALLBACK';
};

type NearbyRestaurantRow = {
  id: number;
  name: string;
  slug: string;
  address: string;
  city: string | null;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  isActive: boolean;
  deliveryRadiusKm: number;
  deliveryEnabled: boolean;
  deliveryBaseFee: number;
  deliveryBaseDistanceKm: number;
  deliveryPerKmFee: number;
  deliveryFeeMin: number | null;
  deliveryFeeCap: number | null;
  freeDeliveryMinAmount: number | null;
  packagingCharge: number;
  isLocationEnabled: boolean;
  distanceKm: number;
  zoneContains: boolean;
  hasDeliveryZones: boolean;
  zoneDeliveryFee: number | null;
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
  deliveryEnabled: boolean;
  deliveryRadiusKm: number;
  deliveryBaseFee: number;
  deliveryBaseDistanceKm: number;
  deliveryPerKmFee: number;
  deliveryFeeMin: number | null;
  deliveryFeeCap: number | null;
  freeDeliveryMinAmount: number | null;
  packagingCharge: number;
  zoneContains: boolean;
  hasDeliveryZones: boolean;
  zoneDeliveryFee: number | null;
  deliveryUnavailableReason: string | null;
  deliveryFeeBreakdown: Record<string, unknown>;
  minimumOrderAmount: number | null;
  estimatedDeliveryTimeMinutes: number;
};

type RestaurantDeliveryQuoteRow = Omit<
  RestaurantDeliveryRow,
  | 'deliveryEnabled'
  | 'deliveryRadiusKm'
  | 'deliveryBaseFee'
  | 'deliveryBaseDistanceKm'
  | 'deliveryPerKmFee'
  | 'deliveryFeeMin'
  | 'deliveryFeeCap'
  | 'zoneContains'
  | 'hasDeliveryZones'
  | 'zoneDeliveryFee'
>;

type RestaurantExistsRow = {
  id: number;
};

type CountRow = {
  count: bigint | number;
};

type NearbyMenuItem = Prisma.MenuItemGetPayload<{
  include: {
    variants: true;
    addonGroups: {
      include: {
        options: true;
      };
    };
    category: true;
  };
}>;

export type NearbyRestaurantWithGeo = NearbyRestaurantRow & {
  categories: {
    id: number;
    restaurantId: number;
    name: string;
    description: string | null;
  }[];
  menuItems: NearbyMenuItem[];
};

type DeliveryQuoteComputationOptions = {
  subtotalAmount?: number;
  enforceMinimumOrderAmount?: boolean;
};

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: GeoCacheService,
    private readonly routing: RoutingService,
  ) {}

  /**
   * Enriches restaurant rows with the same route metrics used by delivery quotes.
   */
  private async enrichWithOsrmDistance(
    restaurants: Array<{
      id: number;
      latitude: number;
      longitude: number;
      distanceKm: number;
    }>,
    userLat: number,
    userLng: number,
  ): Promise<Map<number, RestaurantRouteData>> {
    const result = new Map<number, RestaurantRouteData>();

    const promises = restaurants.map(async (restaurant) => {
      result.set(
        restaurant.id,
        await this.resolveRestaurantRouteData(
          restaurant.id,
          { latitude: restaurant.latitude, longitude: restaurant.longitude },
          { latitude: userLat, longitude: userLng },
        ),
      );
    });

    await Promise.all(promises);
    return result;
  }

  async findNearbyRestaurants(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
    offset: number;
  }): Promise<NearbyRestaurantWithGeo[]> {
    const cacheKey = this.buildCacheKey('restaurants', params.lat, params.lng, [
      params.radiusKm,
      params.limit,
      params.offset,
    ]);
    const cached = await this.cache.get<NearbyRestaurantWithGeo[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const point = Prisma.sql`public.ST_SetSRID(public.ST_MakePoint(${params.lng}, ${params.lat}), 4326)`;
    const rows = await this.prisma.$queryRaw<NearbyRestaurantRow[]>(Prisma.sql`
      WITH customer AS (
        SELECT ${point} AS geom, ${point}::public.geography AS geog
      ),
      restaurant_scope AS (
        SELECT
          r."id",
          r."name",
          r."slug",
          r."address",
          r."city",
          r."latitude",
          r."longitude",
          r."image_url" AS "imageUrl",
          r."is_active" AS "isActive",
          r."delivery_radius_km" AS "deliveryRadiusKm",
          r."delivery_enabled" AS "deliveryEnabled",
          r."delivery_base_fee" AS "deliveryBaseFee",
          r."delivery_base_distance_km" AS "deliveryBaseDistanceKm",
          r."delivery_per_km_fee" AS "deliveryPerKmFee",
          r."delivery_fee_min" AS "deliveryFeeMin",
          r."delivery_fee_cap" AS "deliveryFeeCap",
          r."free_delivery_min_amount" AS "freeDeliveryMinAmount",
          r."packaging_charge" AS "packagingCharge",
          r."is_location_enabled" AS "isLocationEnabled",
          ROUND((public.ST_Distance(r."location", customer.geog) / 1000)::numeric, 2)::float AS "distanceKm",
          EXISTS (
            SELECT 1
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND public.ST_Contains(dz."polygon", customer.geom)
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
              AND public.ST_Contains(dz."polygon", customer.geom)
            ORDER BY dz."delivery_fee" ASC
            LIMIT 1
          ) AS "zoneDeliveryFee",
          (
            SELECT dz."minimum_order_amount"
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND public.ST_Contains(dz."polygon", customer.geom)
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
          AND public.ST_DWithin(r."location", customer.geog, ${params.radiusKm * 1000})
      )
      SELECT
        "id",
        "name",
        "slug",
        "address",
        "city",
        "latitude",
        "longitude",
        "imageUrl",
        "isActive",
        "deliveryRadiusKm",
        "deliveryEnabled",
        "deliveryBaseFee",
        "deliveryBaseDistanceKm",
        "deliveryPerKmFee",
        "deliveryFeeMin",
        "deliveryFeeCap",
        "freeDeliveryMinAmount",
        "packagingCharge",
        "isLocationEnabled",
        "distanceKm",
        "zoneContains",
        "hasDeliveryZones",
        COALESCE("zoneDeliveryFee", 0)::float AS "zoneDeliveryFee",
        CASE
          WHEN "deliveryEnabled" = false THEN false
          WHEN "hasDeliveryZones" THEN "zoneContains"
          ELSE "distanceKm" <= "deliveryRadiusKm"
        END AS "deliveryAvailable",
        COALESCE("zoneDeliveryFee", 0)::float AS "deliveryFee",
        "minimumOrderAmount",
        (20 + CEIL("distanceKm" * 3))::int AS "estimatedDeliveryTimeMinutes",
        "availableMenuItemsCount"
      FROM restaurant_scope
      ORDER BY "distanceKm" ASC, "availableMenuItemsCount" DESC, "name" ASC
      LIMIT ${params.limit}
      OFFSET ${params.offset}
    `);

    const restaurantIds = rows.map((row) => row.id);
    const [categories, menuItems] =
      restaurantIds.length > 0
        ? await Promise.all([
            this.prisma.category.findMany({
              where: { restaurantId: { in: restaurantIds } },
              orderBy: { name: 'asc' },
            }),
            // this.prisma.menuItem.findMany({
            //   where: {
            //     restaurantId: { in: restaurantIds },
            //     isAvailable: true,
            //   },
            //   orderBy: [{ restaurantId: 'asc' }, { categoryId: 'asc' }, { name: 'asc' }],
            // }),
            this.prisma.menuItem.findMany({
              where: {
                restaurantId: {
                  in: restaurantIds,
                },
                isAvailable: true,
              },

              include: {
                variants: true,

                addonGroups: {
                  where: {
                    isActive: true,
                  },

                  orderBy: {
                    sortOrder: 'asc',
                  },

                  include: {
                    options: {
                      where: {
                        isAvailable: true,
                      },

                      orderBy: {
                        sortOrder: 'asc',
                      },
                    },
                  },
                },

                category: true,
              },

              orderBy: [
                {
                  restaurantId: 'asc',
                },
                {
                  categoryId: 'asc',
                },
                {
                  name: 'asc',
                },
              ],
            }),
          ])
        : [[], []];

    // Enrich rows with OSRM driving distances
    const osrmRoutes = await this.enrichWithOsrmDistance(rows, params.lat, params.lng);

    const result = rows.map((row) => {
      const route = osrmRoutes.get(row.id) || {
        drivingDistanceKm: row.distanceKm,
        estimatedDurationMinutes: Math.ceil(20 + row.distanceKm * 3),
        routeSource: 'AIR_DISTANCE_FALLBACK' as const,
      };

      // Use OSRM driving distance for delivery fee calculation
      const delivery = this.computeDeliveryQuote(
        { ...row, distanceKm: route.drivingDistanceKm },
        {
          subtotalAmount: 0,
          enforceMinimumOrderAmount: false,
        },
      );

      return {
        ...row,
        distanceKm: route.drivingDistanceKm,
        estimatedDeliveryTimeMinutes:
          route.estimatedDurationMinutes ?? Math.ceil(20 + route.drivingDistanceKm * 3),
        deliveryAvailable: delivery.isDeliveryAvailable,
        deliveryFee: delivery.deliveryCharge,
        minimumOrderAmount: row.minimumOrderAmount,
        categories: categories.filter((category) => category.restaurantId === row.id),
        menuItems: menuItems.filter((menuItem) => menuItem.restaurantId === row.id),
      };
    });

    await this.cache.set(cacheKey, result, GEO_CACHE_TTL_SECONDS);

    return result;
  }

  async countNearbyRestaurants(params: {
    lat: number;
    lng: number;
    radiusKm: number;
  }): Promise<number> {
    const point = Prisma.sql`public.ST_SetSRID(public.ST_MakePoint(${params.lng}, ${params.lat}), 4326)`;
    const rows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      WITH customer AS (
        SELECT ${point}::public.geography AS geog
      )
      SELECT COUNT(*) AS "count"
      FROM "restaurants" r
      CROSS JOIN customer
      WHERE r."is_active" = true
        AND r."is_location_enabled" = true
        AND r."location" IS NOT NULL
        AND public.ST_DWithin(r."location", customer.geog, ${params.radiusKm * 1000})
    `);

    return Number(rows[0]?.count ?? 0);
  }

  async getRestaurantDeliveryQuote(
    restaurantId: number,
    lat: number,
    lng: number,
    options: DeliveryQuoteComputationOptions = {},
  ): Promise<DeliveryQuoteDto> {
    const cacheKey = this.buildCacheKey('delivery', lat, lng, [
      restaurantId,
      options.subtotalAmount ?? 0,
      options.enforceMinimumOrderAmount ? 'enforce-min' : 'browse',
    ]);
    const cached = await this.cache.get<DeliveryQuoteDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const row = await this.getRestaurantDeliveryRow(restaurantId, lat, lng, options);
    const result: DeliveryQuoteDto = {
      deliveryAvailable: row.deliveryAvailable,
      distanceKm: row.distanceKm,
      deliveryFee: row.deliveryFee,
      packagingCharge: row.packagingCharge,
      freeDeliveryMinAmount: row.freeDeliveryMinAmount,
      deliveryUnavailableReason: row.deliveryUnavailableReason,
      deliveryFeeBreakdown: row.deliveryFeeBreakdown,
      estimatedDeliveryTimeMinutes: row.estimatedDeliveryTimeMinutes,
      minimumOrderAmount: row.minimumOrderAmount ?? undefined,
      reason: row.deliveryAvailable
        ? 'Delivery fee calculated by distance'
        : 'Delivery is unavailable for this restaurant',
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
      limit: 1,
      offset: 0,
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

  buildMenuCacheKey(
    restaurantId: number,
    lat?: number,
    lng?: number,
    parts: (string | number)[] = [],
  ): string {
    const suffix = parts.length ? `:${parts.join(':')}` : '';

    if (lat === undefined || lng === undefined) {
      return `menu:${restaurantId}:global${suffix}`;
    }

    return this.buildCacheKey('menu', lat, lng, [restaurantId, ...parts]);
  }

  private async getRestaurantDeliveryRow(
    restaurantId: number,
    lat: number,
    lng: number,
    options: DeliveryQuoteComputationOptions = {},
  ): Promise<RestaurantDeliveryQuoteRow> {
    const point = Prisma.sql`public.ST_SetSRID(public.ST_MakePoint(${lng}, ${lat}), 4326)`;
    const rows = await this.prisma.$queryRaw<RestaurantDeliveryRow[]>(Prisma.sql`
      WITH customer AS (
        SELECT ${point} AS geom, ${point}::public.geography AS geog
      ),
      restaurant_scope AS (
        SELECT
          r."id" AS "restaurantId",
          r."delivery_radius_km" AS "deliveryRadiusKm",
          r."delivery_enabled" AS "deliveryEnabled",
          r."delivery_base_fee" AS "deliveryBaseFee",
          r."delivery_base_distance_km" AS "deliveryBaseDistanceKm",
          r."delivery_per_km_fee" AS "deliveryPerKmFee",
          r."delivery_fee_min" AS "deliveryFeeMin",
          r."delivery_fee_cap" AS "deliveryFeeCap",
          r."free_delivery_min_amount" AS "freeDeliveryMinAmount",
          r."packaging_charge" AS "packagingCharge",
          ROUND((public.ST_Distance(r."location", customer.geog) / 1000)::numeric, 2)::float AS "distanceKm",
          EXISTS (
            SELECT 1
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND public.ST_Contains(dz."polygon", customer.geom)
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
              AND public.ST_Contains(dz."polygon", customer.geom)
            ORDER BY dz."delivery_fee" ASC
            LIMIT 1
          ) AS "zoneDeliveryFee",
          (
            SELECT dz."minimum_order_amount"
            FROM "delivery_zones" dz
            WHERE dz."restaurant_id" = r."id"
              AND public.ST_Contains(dz."polygon", customer.geom)
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
          WHEN "deliveryEnabled" = false THEN false
          WHEN "hasDeliveryZones" THEN "zoneContains"
          ELSE "distanceKm" <= "deliveryRadiusKm"
        END AS "deliveryAvailable",
        "distanceKm",
        "deliveryEnabled",
        "deliveryRadiusKm",
        "deliveryBaseFee",
        "deliveryBaseDistanceKm",
        "deliveryPerKmFee",
        "deliveryFeeMin",
        "deliveryFeeCap",
        "freeDeliveryMinAmount",
        "packagingCharge",
        "zoneContains",
        "hasDeliveryZones",
        COALESCE("zoneDeliveryFee", 0)::float AS "zoneDeliveryFee",
        COALESCE("zoneDeliveryFee", 0)::float AS "deliveryFee",
        "minimumOrderAmount",
        (20 + CEIL("distanceKm" * 3))::int AS "estimatedDeliveryTimeMinutes"
      FROM restaurant_scope
    `);

    if (!rows[0]) {
      await this.ensureRestaurantExists(restaurantId);
      throw new NotFoundException('Restaurant is not enabled for location delivery');
    }

    const row = rows[0];

    // Query restaurant details to get coordinates for OSRM
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { latitude: true, longitude: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const route = await this.resolveRestaurantRouteData(
      restaurantId,
      { latitude: restaurant.latitude, longitude: restaurant.longitude },
      { latitude: lat, longitude: lng },
    );
    const drivingDistanceKm = route.drivingDistanceKm;
    const estimatedDurationMinutes =
      route.estimatedDurationMinutes ?? Math.ceil(20 + route.drivingDistanceKm * 3);

    const delivery = this.computeDeliveryQuote({ ...row, distanceKm: drivingDistanceKm }, options);

    return {
      restaurantId: row.restaurantId,
      deliveryAvailable: delivery.isDeliveryAvailable,
      distanceKm: drivingDistanceKm,
      deliveryFee: delivery.deliveryCharge,
      packagingCharge: delivery.packagingCharge,
      freeDeliveryMinAmount: row.freeDeliveryMinAmount,
      deliveryUnavailableReason: delivery.deliveryUnavailableReason,
      deliveryFeeBreakdown: delivery.deliveryFeeBreakdown,
      minimumOrderAmount: row.minimumOrderAmount,
      estimatedDeliveryTimeMinutes: Math.ceil(estimatedDurationMinutes),
    };
  }

  private computeDeliveryQuote(
    row: Pick<
      RestaurantDeliveryRow | NearbyRestaurantRow,
      | 'deliveryEnabled'
      | 'deliveryRadiusKm'
      | 'deliveryBaseFee'
      | 'deliveryBaseDistanceKm'
      | 'deliveryPerKmFee'
      | 'deliveryFeeMin'
      | 'deliveryFeeCap'
      | 'freeDeliveryMinAmount'
      | 'packagingCharge'
      | 'distanceKm'
      | 'zoneContains'
      | 'hasDeliveryZones'
      | 'zoneDeliveryFee'
      | 'minimumOrderAmount'
    >,
    options: DeliveryQuoteComputationOptions,
  ): {
    isDeliveryAvailable: boolean;
    deliveryCharge: number;
    packagingCharge: number;
    deliveryDistanceKm: number | null;
    deliveryUnavailableReason: string | null;
    deliveryFeeBreakdown: DeliveryFeeBreakdown;
  } {
    const subtotalAmount = options.subtotalAmount ?? 0;
    const baseQuote = calculateDeliveryFee(row, row.distanceKm, subtotalAmount);

    if (!baseQuote.isDeliveryAvailable) {
      return baseQuote;
    }

    if (
      options.enforceMinimumOrderAmount &&
      row.minimumOrderAmount &&
      subtotalAmount < row.minimumOrderAmount
    ) {
      return {
        isDeliveryAvailable: false,
        deliveryCharge: 0,
        packagingCharge: 0,
        deliveryDistanceKm: row.distanceKm,
        deliveryUnavailableReason: `Minimum order amount is Rs. ${row.minimumOrderAmount}`,
        deliveryFeeBreakdown: {
          ...baseQuote.deliveryFeeBreakdown,
          deliveryCharge: 0,
          packagingCharge: 0,
        },
      };
    }

    return baseQuote;
  }

  private buildCacheKey(
    prefix: string,
    lat: number,
    lng: number,
    parts: (string | number)[],
  ): string {
    const normalizedLat = this.formatCoordinate(lat);
    const normalizedLng = this.formatCoordinate(lng);
    return `${prefix}:${normalizedLat}:${normalizedLng}:${parts.join(':')}`;
  }

  private async resolveRestaurantRouteData(
    restaurantId: number,
    restaurantLocation: { latitude: number; longitude: number },
    userLocation: { latitude: number; longitude: number },
  ): Promise<RestaurantRouteData> {
    try {
      const routeData = await this.routing.getShortestRoute(userLocation, restaurantLocation);

      return {
        drivingDistanceKm: routeData.distanceKm,
        estimatedDurationMinutes: routeData.durationMinutes,
        routeSource: routeData.source === 'ROUTE' ? 'OSRM' : 'AIR_DISTANCE_FALLBACK',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to resolve route for restaurant ${restaurantId}: ${message}. Using air-distance fallback.`,
      );
      const fallback = this.routing.buildFallbackRoute(userLocation, restaurantLocation);

      return {
        drivingDistanceKm: fallback.distanceKm,
        estimatedDurationMinutes: fallback.durationMinutes,
        routeSource: 'AIR_DISTANCE_FALLBACK',
      };
    }
  }

  private formatCoordinate(coordinate: number): string {
    return String(coordinate);
  }
}
