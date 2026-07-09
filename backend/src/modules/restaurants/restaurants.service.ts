import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Restaurant, Category, Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';

import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/create-update-restaurant.dto';
import {
  RestaurantCategoryResponseDto,
  RestaurantMenuItemResponseDto,
  RestaurantResponseDto,
  RestaurantTableResponseDto,
} from './dto/restaurant-response.dto';
import {
  CreateRestaurantTableDto,
  RestaurantTableQrResponseDto,
  UpdateRestaurantTableDto,
} from './dto/restaurant-table.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CloudinaryImageUploadResult } from '../../common/cloudinary/cloudinary.types';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { generateUniqueRestaurantSlug } from '../../common/utils/restaurant-slug.util';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';
import { QrCodeService } from '../tables/qr-code.service';
import { generateSecureToken } from '../tables/utils/token.util';

type RestaurantMenuItemWithOptions = {
  id: number;
  restaurantId: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  isAvailable: boolean;
  preparationTime: number | null;
  variants?: unknown[];
  addonGroups?: unknown[];
};

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly qrCodeService: QrCodeService,
  ) {}

  /**
   * Get all active restaurants
   */
  async getRestaurants(query?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<RestaurantResponseDto>> {
    const pagination = normalizePagination(query, { limit: 20, maxLimit: 50 });
    const where: Prisma.RestaurantWhereInput = { isActive: true };
    const [total, restaurants] = await Promise.all([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        include: { categories: true },
        orderBy: { name: 'asc' },
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: restaurants.map((restaurant: Restaurant & { categories: Category[] }) =>
        this.mapRestaurant(restaurant),
      ),
      ...buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Get single restaurant by ID
   */
  async getRestaurant(id: number): Promise<RestaurantResponseDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { categories: true, tables: true, menuItems: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return this.mapRestaurant(restaurant);
  }

  /**
   * Get single restaurant by slug
   */
  async getRestaurantBySlug(slug: string): Promise<RestaurantResponseDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      include: { categories: true, tables: true, menuItems: true },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }
    return this.mapRestaurant(restaurant);
  }

  /**
   * Resolve a restaurant slug to its numeric ID
   */
  async resolveRestaurantIdBySlug(slug: string): Promise<number> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, isActive: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant.id;
  }

  async getRestaurantTables(restaurantId: number): Promise<RestaurantTableResponseDto[]> {
    await this.ensureRestaurantExists(restaurantId);

    const tables = await this.prisma.restaurantTable.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: 'asc' },
    });

    return tables.map((table) => this.mapRestaurantTable(table));
  }

  async createRestaurantTable(
    restaurantId: number,
    data: CreateRestaurantTableDto,
  ): Promise<RestaurantTableResponseDto> {
    const tableNumber = data.tableNumber?.trim();
    const logContext = { restaurantId, tableNumber };

    try {
      this.logger.debug(`[CREATE_TABLE] Starting table creation`, logContext);

      if (!tableNumber) {
        throw new BadRequestException('Table number is required');
      }

      // Validate restaurant exists
      await this.ensureRestaurantExists(restaurantId);
      this.logger.debug(`[CREATE_TABLE] Restaurant validation passed`, logContext);

      const tableToken = generateSecureToken('tbl');
      const qrCodeUrl = this.qrCodeService.buildTableQrUrl(tableToken);

      const table = await this.prisma.restaurantTable.create({
        data: {
          restaurantId,
          tableNumber,
          status: data.status ?? 'ACTIVE',
          tableToken,
          qrCodeUrl,
          qrCode: tableToken,
        },
      });
      this.logger.debug(`[CREATE_TABLE] Table created`, { ...logContext, tableId: table.id });

      const result = this.mapRestaurantTable(table);
      this.logger.log(`[CREATE_TABLE] Table created successfully`, {
        ...logContext,
        tableId: table.id,
      });
      return result;
    } catch (error) {
      this.rethrowRestaurantTableError('create', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`[CREATE_TABLE] Failed: ${errorMessage}`, errorStack, logContext);
      throw error;
    }
  }

  async updateRestaurantTable(
    restaurantId: number,
    tableId: number,
    data: UpdateRestaurantTableDto,
  ): Promise<RestaurantTableResponseDto> {
    await this.ensureRestaurantExists(restaurantId);
    const table = await this.findRestaurantTable(restaurantId, tableId);
    const nextTableNumber = data.tableNumber?.trim() ?? table.tableNumber;

    if (!nextTableNumber) {
      throw new BadRequestException('Table number is required');
    }

    try {
      const updatedTable = await this.prisma.restaurantTable.update({
        where: { id: tableId },
        data: {
          tableNumber: nextTableNumber,
          status: data.status ?? table.status,
        },
      });

      return this.mapRestaurantTable(updatedTable);
    } catch (error) {
      this.rethrowRestaurantTableError('update', error);
      throw error;
    }
  }

  async deleteRestaurantTable(restaurantId: number, tableId: number): Promise<{ message: string }> {
    await this.ensureRestaurantExists(restaurantId);
    await this.findRestaurantTable(restaurantId, tableId);

    await this.prisma.restaurantTable.delete({
      where: { id: tableId },
    });

    return { message: 'Table deleted successfully' };
  }

  async getRestaurantTableQr(
    restaurantId: number,
    tableId: number,
  ): Promise<RestaurantTableQrResponseDto> {
    const table = await this.findRestaurantTable(restaurantId, tableId);
    const { qrCodeUrl } = await this.ensureTableTokenQr(table);

    return { qrUrl: qrCodeUrl };
  }

  async downloadRestaurantTableQrSvg(
    restaurantId: number,
    tableId: number,
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const { qrUrl } = await this.getRestaurantTableQr(restaurantId, tableId);
    const svg = await QRCode.toString(qrUrl, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    });

    return {
      buffer: Buffer.from(svg),
      fileName: `restaurant-${restaurantId}-table-${tableId}.svg`,
      contentType: 'image/svg+xml',
    };
  }

  private async ensureRestaurantExists(restaurantId: number): Promise<void> {
    try {
      this.logger.debug(`[VALIDATE_RESTAURANT] Checking restaurant existence`, { restaurantId });
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });

      if (!restaurant) {
        this.logger.warn(`[VALIDATE_RESTAURANT] Restaurant not found`, { restaurantId });
        throw new NotFoundException('Restaurant not found');
      }

      if (!restaurant.isActive) {
        this.logger.warn(`[VALIDATE_RESTAURANT] Restaurant is inactive`, { restaurantId });
        throw new NotFoundException('Restaurant not found or is inactive');
      }

      this.logger.debug(`[VALIDATE_RESTAURANT] Restaurant validation passed`, {
        restaurantId,
        name: restaurant.name,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[VALIDATE_RESTAURANT] Database error: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        { restaurantId },
      );
      throw error;
    }
  }

  private async findRestaurantTable(
    restaurantId: number,
    tableId: number,
  ): Promise<{
    id: number;
    restaurantId: number;
    tableNumber: string;
    qrCode: string | null;
    qrCodeUrl: string | null;
    tableToken: string | null;
    status: string | null;
  }> {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table || table.restaurantId !== restaurantId) {
      throw new NotFoundException('Table not found or does not belong to this restaurant');
    }

    return table;
  }

  private async ensureTableTokenQr(table: {
    id: number;
    tableToken: string | null;
    qrCodeUrl: string | null;
  }): Promise<{ tableToken: string; qrCodeUrl: string }> {
    if (table.tableToken && table.qrCodeUrl) {
      return { tableToken: table.tableToken, qrCodeUrl: table.qrCodeUrl };
    }

    const tableToken = table.tableToken ?? generateSecureToken('tbl');
    const qrCodeUrl = this.qrCodeService.buildTableQrUrl(tableToken);

    await this.prisma.restaurantTable.update({
      where: { id: table.id },
      data: {
        tableToken,
        qrCodeUrl,
        qrCode: tableToken,
      },
    });

    return { tableToken, qrCodeUrl };
  }

  private rethrowRestaurantTableError(action: 'create' | 'update', error: unknown): never | void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    switch (error.code) {
      case 'P2002':
        throw new BadRequestException('Table number already exists for this restaurant');
      case 'P2021':
      case 'P2022':
        throw new BadRequestException(
          'Server database schema is outdated for table management. Run prisma migrate deploy on production.',
        );
      default:
        throw new BadRequestException(`Failed to ${action} table: ${error.message}`);
    }
  }

  /**
   * Search restaurants by name (optional: sort by distance when lat/lng provided)
   */
  async searchRestaurants(
    query: string,
    coords?: { lat: number; lng: number },
    paginationQuery?: { offset?: number; limit?: number },
  ): Promise<PaginatedResult<RestaurantResponseDto>> {
    const pagination = normalizePagination(paginationQuery, { limit: 20, maxLimit: 50 });
    const q = query.trim();

    if (q.length < 1) {
      return {
        items: [],
        ...buildPaginationMeta(0, pagination),
      };
    }

    const where: Prisma.RestaurantWhereInput = {
      isActive: true,
      name: { contains: q, mode: 'insensitive' },
    };

    const [total, restaurants] = await Promise.all([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        include: { categories: true },
        orderBy: { name: 'asc' },
        ...toPrismaPagination(pagination),
      }),
    ]);

    let mapped = restaurants.map((restaurant: Restaurant & { categories: Category[] }) =>
      this.mapRestaurant(restaurant),
    );

    if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
      mapped = [...mapped].sort((a, b) => {
        const da = this.haversineKm(coords.lat, coords.lng, a.latitude, a.longitude);
        const db = this.haversineKm(coords.lat, coords.lng, b.latitude, b.longitude);
        return da - db;
      });
    } else {
      mapped.sort((a, b) => a.name.localeCompare(b.name));
    }

    return {
      items: mapped,
      ...buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Find nearby restaurants based on user coordinates
   */
  async findNearbyRestaurants(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<RestaurantResponseDto>> {
    const pagination = normalizePagination(params, { limit: 20, maxLimit: 50 });
    const radiusKm = params.radiusKm ?? 10;
    const [total, restaurants] = await Promise.all([
      this.locationService.countNearbyRestaurants({
        lat: params.lat,
        lng: params.lng,
        radiusKm,
      }),
      this.locationService.findNearbyRestaurants({
        lat: params.lat,
        lng: params.lng,
        radiusKm,
        limit: pagination.limit,
        offset: pagination.offset,
      }),
    ]);

    return {
      items: restaurants.map((restaurant) => this.mapRestaurant(restaurant)),
      ...buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Get all restaurants for admin (including inactive)
   */
  async getAllRestaurantsForAdmin(query?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<RestaurantResponseDto>> {
    const pagination = normalizePagination(query, { limit: 20, maxLimit: 50 });
    const [total, restaurants] = await Promise.all([
      this.prisma.restaurant.count(),
      this.prisma.restaurant.findMany({
        include: { categories: true },
        orderBy: [{ createdAt: 'desc' }],
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: restaurants.map((restaurant: Restaurant & { categories: Category[] }) =>
        this.mapRestaurant(restaurant),
      ),
      ...buildPaginationMeta(total, pagination),
    };
  }

  /**
   * Create a new restaurant (Admin only)
   */
  async createRestaurant(data: CreateRestaurantDto): Promise<RestaurantResponseDto> {
    // Validate coordinates
    if (!this.isValidCoordinates(data.latitude, data.longitude)) {
      throw new BadRequestException('Invalid coordinates provided');
    }
    this.validateDeliveryPricing(data);

    try {
      const slug = await generateUniqueRestaurantSlug(this.prisma, data.name);

      // Create restaurant without location field first
      const restaurant = await this.prisma.restaurant.create({
        data: {
          name: data.name,
          slug,
          address: data.address,
          city: data.city ?? null,
          latitude: data.latitude,
          longitude: data.longitude,
          cuisineType: data.cuisineType ?? null,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          deliveryRadiusKm: data.deliveryRadiusKm ?? 8,
          deliveryEnabled: data.deliveryEnabled ?? true,
          deliveryBaseFee: data.deliveryBaseFee ?? 20,
          deliveryBaseDistanceKm: data.deliveryBaseDistanceKm ?? 1,
          deliveryPerKmFee: data.deliveryPerKmFee ?? 7,
          deliveryFeeMin: data.deliveryFeeMin ?? null,
          deliveryFeeCap: data.deliveryFeeCap ?? null,
          freeDeliveryMinAmount: data.freeDeliveryMinAmount ?? null,
          packagingCharge: data.packagingCharge ?? 0,
          isLocationEnabled: data.isLocationEnabled ?? true,
          isActive: data.isActive ?? true,
          gstin: data.gstin?.trim().toUpperCase() || null,
          gstRate: data.gstRate ?? 5,
          gstEnabled: data.gstEnabled ?? true,
        },
        include: { categories: true },
      });

      // Update location using raw query for PostGIS
      await this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE "restaurants"
          SET "location" = public.ST_SetSRID(public.ST_MakePoint(${data.longitude}::double precision, ${data.latitude}::double precision), 4326)::public.geography
          WHERE "id" = ${restaurant.id}
        `,
      );

      // Fetch updated restaurant
      const updatedRestaurant = await this.prisma.restaurant.findUnique({
        where: { id: restaurant.id },
        include: { categories: true },
      });

      return this.mapRestaurant(updatedRestaurant!);
    } catch (error) {
      console.error(`[DEBUG] Error in createRestaurant:`, error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Failed to create restaurant: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Update restaurant by ID (Admin/Manager)
   */
  async updateRestaurant(id: number, data: UpdateRestaurantDto): Promise<RestaurantResponseDto> {
    // Verify restaurant exists
    const existingRestaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, imageUrl: true, imagePublicId: true },
    });

    if (!existingRestaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Validate coordinates if provided
    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (!this.isValidCoordinates(data.latitude, data.longitude)) {
        throw new BadRequestException('Invalid coordinates provided');
      }
    }
    this.validateDeliveryPricing(data);

    try {
      const imageUrl = data.imageUrl === undefined ? undefined : data.imageUrl;
      const shouldReplaceImage = imageUrl !== undefined && imageUrl !== existingRestaurant.imageUrl;
      const updateData: Prisma.RestaurantUpdateInput = {
        name: data.name,
        address: data.address,
        city: data.city,
        cuisineType: data.cuisineType,
        description: data.description,
        imageUrl,
        imagePublicId: shouldReplaceImage ? null : undefined,
        deliveryRadiusKm: data.deliveryRadiusKm,
        deliveryEnabled: data.deliveryEnabled,
        deliveryBaseFee: data.deliveryBaseFee,
        deliveryBaseDistanceKm: data.deliveryBaseDistanceKm,
        deliveryPerKmFee: data.deliveryPerKmFee,
        deliveryFeeMin: data.deliveryFeeMin,
        deliveryFeeCap: data.deliveryFeeCap,
        freeDeliveryMinAmount: data.freeDeliveryMinAmount,
        packagingCharge: data.packagingCharge,
        isLocationEnabled: data.isLocationEnabled,
        isActive: data.isActive,
        gstin: data.gstin === undefined ? undefined : data.gstin?.trim().toUpperCase() || null,
        gstRate: data.gstRate,
        gstEnabled: data.gstEnabled,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        const typedKey = key as keyof typeof updateData;
        if (updateData[typedKey] === undefined) {
          delete updateData[typedKey];
        }
      });

      // Update coordinates if provided
      if (data.latitude !== undefined && data.longitude !== undefined) {
        updateData.latitude = data.latitude;
        updateData.longitude = data.longitude;
        // Update location using raw query so PostGIS geography data stays in sync
        await this.prisma.$executeRaw(
          Prisma.sql`
            UPDATE "restaurants"
            SET "location" = public.ST_SetSRID(public.ST_MakePoint(${data.longitude}::double precision, ${data.latitude}::double precision), 4326)::public.geography
            WHERE "id" = ${id}
          `,
        );
      }

      const restaurant = await this.prisma.restaurant.update({
        where: { id },
        data: updateData,
        include: { categories: true },
      });

      if (shouldReplaceImage && existingRestaurant.imagePublicId) {
        await this.cloudinaryService.deleteImage(existingRestaurant.imagePublicId);
      }

      return this.mapRestaurant(restaurant);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException('Failed to update restaurant: ' + error.message);
      }
      throw error;
    }
  }

  /**
   * Delete restaurant by ID (Admin only)
   */
  async deleteRestaurant(id: number): Promise<{ message: string }> {
    // Verify restaurant exists
    const existingRestaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });

    if (!existingRestaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // Check if restaurant has orders
    const orderCount = await this.prisma.order.count({
      where: { restaurantId: id },
    });

    if (orderCount > 0) {
      // Soft delete: mark as inactive
      await this.prisma.restaurant.update({
        where: { id },
        data: { isActive: false },
      });
      return { message: 'Restaurant deactivated successfully (has existing orders)' };
    } else {
      // Hard delete
      await this.prisma.restaurant.delete({
        where: { id },
      });
      await this.cloudinaryService.deleteImage(existingRestaurant.imagePublicId);
      return { message: 'Restaurant deleted successfully' };
    }
  }

  async uploadRestaurantImage(
    id: number,
    file: Express.Multer.File,
  ): Promise<RestaurantResponseDto> {
    const existingRestaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { imagePublicId: true },
    });

    if (!existingRestaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    let uploadedImage: CloudinaryImageUploadResult | null = null;

    try {
      uploadedImage = await this.cloudinaryService.uploadImage(file, 'restaurants');

      const restaurant = await this.prisma.restaurant.update({
        where: { id },
        data: {
          imageUrl: uploadedImage.secureUrl,
          imagePublicId: uploadedImage.publicId,
        },
        include: { categories: true },
      });

      await this.cloudinaryService.deleteImage(existingRestaurant.imagePublicId);

      return this.mapRestaurant(restaurant);
    } catch (error) {
      if (uploadedImage) {
        await this.cloudinaryService.deleteImage(uploadedImage.publicId);
      }

      this.logger.warn(`Restaurant image upload failed for ${id}`);
      throw error;
    }
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  private validateDeliveryPricing(data: CreateRestaurantDto | UpdateRestaurantDto): void {
    if (
      data.deliveryFeeCap !== undefined &&
      data.deliveryFeeCap !== null &&
      data.deliveryFeeMin !== undefined &&
      data.deliveryFeeMin !== null &&
      data.deliveryFeeCap < data.deliveryFeeMin
    ) {
      throw new BadRequestException('Delivery max fee cannot be less than min fee');
    }
  }

  private haversineKm(lat: number, lng: number, rLat: number, rLng: number): number {
    const R = 6371;
    const dLat = this.deg2rad(rLat - lat);
    const dLon = this.deg2rad(rLng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat)) *
        Math.cos(this.deg2rad(rLat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private mapRestaurantCategory(category: {
    id: number;
    restaurantId: number;
    name: string;
    description: string | null;
  }): RestaurantCategoryResponseDto {
    return {
      id: category.id,
      restaurantId: category.restaurantId,
      name: category.name,
      description: category.description,
    };
  }

  private mapRestaurantTable(table: {
    id: number;
    restaurantId: number;
    tableNumber: string;
    qrCode: string | null;
    qrCodeUrl?: string | null;
    status: string | null;
  }): RestaurantTableResponseDto {
    return {
      id: table.id,
      restaurantId: table.restaurantId,
      tableNumber: table.tableNumber,
      qrCode: table.qrCodeUrl ?? table.qrCode,
      status: table.status,
    };
  }

  private mapRestaurantMenuItem(
    menuItem: RestaurantMenuItemWithOptions,
  ): RestaurantMenuItemResponseDto {
    return {
      id: menuItem.id,
      restaurantId: menuItem.restaurantId,
      categoryId: menuItem.categoryId,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      isAvailable: menuItem.isAvailable,
      preparationTime: menuItem.preparationTime,
      variants: menuItem.variants,
      addonGroups: menuItem.addonGroups,
      // discountPrice: menuItem.discountPrice,
      // imageUrl: menuItem.imageUrl,
      // foodType: menuItem.foodType,
      // spicyLevel: menuItem.spicyLevel,
      // ingredients: menuItem.ingredients,
      // isBestSelling: menuItem.isBestSelling,
      // rating: menuItem.rating,
      // category: menuItem.category,
    };
  }

  private mapRestaurant(restaurant: {
    id: number;
    name: string;
    slug: string;
    address: string;
    city: string | null;
    latitude: number;
    longitude: number;
    cuisineType?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    deliveryRadiusKm?: number;
    deliveryEnabled?: boolean;
    deliveryBaseFee?: number;
    deliveryBaseDistanceKm?: number;
    deliveryPerKmFee?: number;
    deliveryFeeMin?: number | null;
    deliveryFeeCap?: number | null;
    freeDeliveryMinAmount?: number | null;
    packagingCharge?: number;
    isLocationEnabled?: boolean;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
    categories: { id: number; restaurantId: number; name: string; description: string | null }[];
    tables?: {
      id: number;
      restaurantId: number;
      tableNumber: string;
      qrCode: string | null;
      status: string | null;
    }[];
    menuItems?: {
      id: number;
      restaurantId: number;
      categoryId: number;
      name: string;
      description: string | null;
      price: number;
      isAvailable: boolean;
      preparationTime: number | null;
    }[];
    distanceKm?: number;
    deliveryAvailable?: boolean;
    estimatedDeliveryTimeMinutes?: number;
    deliveryFee?: number;
    minimumOrderAmount?: number | null;
    availableMenuItemsCount?: number;
    gstin?: string | null;
    gstRate?: number;
    gstEnabled?: boolean;
  }): RestaurantResponseDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      address: restaurant.address,
      city: restaurant.city,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      cuisineType: restaurant.cuisineType,
      description: restaurant.description,
      imageUrl: restaurant.imageUrl,
      isActive: restaurant.isActive,
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      deliveryEnabled: restaurant.deliveryEnabled,
      deliveryBaseFee: restaurant.deliveryBaseFee,
      deliveryBaseDistanceKm: restaurant.deliveryBaseDistanceKm,
      deliveryPerKmFee: restaurant.deliveryPerKmFee,
      deliveryFeeMin: restaurant.deliveryFeeMin,
      deliveryFeeCap: restaurant.deliveryFeeCap,
      freeDeliveryMinAmount: restaurant.freeDeliveryMinAmount,
      packagingCharge: restaurant.packagingCharge,
      isLocationEnabled: restaurant.isLocationEnabled,
      categories: restaurant.categories.map((category) => this.mapRestaurantCategory(category)),
      tables: restaurant.tables?.map((table) => this.mapRestaurantTable(table)),
      menuItems: restaurant.menuItems?.map((menuItem) => this.mapRestaurantMenuItem(menuItem)),
      distanceKm: restaurant.distanceKm,
      deliveryAvailable: restaurant.deliveryAvailable,
      estimatedDeliveryTimeMinutes: restaurant.estimatedDeliveryTimeMinutes,
      deliveryFee: restaurant.deliveryFee,
      minimumOrderAmount: restaurant.minimumOrderAmount,
      availableMenuItemsCount: restaurant.availableMenuItemsCount,
      gstin: restaurant.gstin,
      gstRate: restaurant.gstRate,
      gstEnabled: restaurant.gstEnabled,
    };
  }
}
