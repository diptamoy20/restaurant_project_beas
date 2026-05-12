import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Restaurant, Category, Prisma } from '@prisma/client';

import {
  RestaurantCategoryResponseDto,
  RestaurantMenuItemResponseDto,
  RestaurantResponseDto,
  RestaurantTableResponseDto,
} from './dto/restaurant-response.dto';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/create-update-restaurant.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  /**
   * Get all active restaurants
   */
  async getRestaurants(): Promise<RestaurantResponseDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: { categories: true },
      orderBy: { name: 'asc' },
    });
    return restaurants.map((restaurant: Restaurant & { categories: Category[] }) =>
      this.mapRestaurant(restaurant),
    );
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
   * Find nearby restaurants based on user coordinates
   */
  async findNearbyRestaurants(params: {
    lat: number;
    lng: number;
    radiusKm?: number;
    page?: number;
    limit?: number;
  }): Promise<RestaurantResponseDto[]> {
    const restaurants = await this.locationService.findNearbyRestaurants({
      lat: params.lat,
      lng: params.lng,
      radiusKm: params.radiusKm ?? 10,
      page: params.page ?? 1,
      limit: params.limit ?? 20,
    });

    return restaurants.map((restaurant) => this.mapRestaurant(restaurant));
  }

  /**
   * Get all restaurants for admin (including inactive)
   */
  async getAllRestaurantsForAdmin(): Promise<RestaurantResponseDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      include: { categories: true },
      orderBy: [{ createdAt: 'desc' }],
    });
    return restaurants.map((restaurant: Restaurant & { categories: Category[] }) =>
      this.mapRestaurant(restaurant),
    );
  }

  /**
   * Create a new restaurant (Admin only)
   */
  async createRestaurant(data: CreateRestaurantDto): Promise<RestaurantResponseDto> {
    // Validate coordinates
    if (!this.isValidCoordinates(data.latitude, data.longitude)) {
      throw new BadRequestException('Invalid coordinates provided');
    }

    try {
      // Create restaurant without location field first
      const restaurant = await this.prisma.restaurant.create({
        data: {
          name: data.name,
          address: data.address,
          city: data.city ?? null,
          latitude: data.latitude,
          longitude: data.longitude,
          cuisineType: data.cuisineType ?? null,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
          deliveryRadiusKm: data.deliveryRadiusKm ?? 8,
          isLocationEnabled: data.isLocationEnabled ?? true,
          isActive: data.isActive ?? true,
        },
        include: { categories: true },
      });

      // Update location using raw query for PostGIS
      await this.prisma.$executeRaw(
        Prisma.sql`
          UPDATE "restaurants"
          SET "location" = public.ST_SetSRID(public.ST_MakePoint(${data.longitude}::double precision, ${data.latitude}::double precision), 4326)::public.geography
          WHERE "id" = ${restaurant.id}
        `
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
    await this.getRestaurant(id);

    // Validate coordinates if provided
    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (!this.isValidCoordinates(data.latitude, data.longitude)) {
        throw new BadRequestException('Invalid coordinates provided');
      }
    }

    try {
      const updateData: Prisma.RestaurantUpdateInput = {
        name: data.name,
        address: data.address,
        city: data.city,
        cuisineType: data.cuisineType,
        description: data.description,
        imageUrl: data.imageUrl,
        deliveryRadiusKm: data.deliveryRadiusKm,
        isLocationEnabled: data.isLocationEnabled,
        isActive: data.isActive,
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
          `
        );
      }

      const restaurant = await this.prisma.restaurant.update({
        where: { id },
        data: updateData,
        include: { categories: true },
      });

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
    const restaurant = await this.getRestaurant(id);

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
      return { message: 'Restaurant deleted successfully' };
    }
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
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
    status: string | null;
  }): RestaurantTableResponseDto {
    return {
      id: table.id,
      restaurantId: table.restaurantId,
      tableNumber: table.tableNumber,
      qrCode: table.qrCode,
      status: table.status,
    };
  }

  private mapRestaurantMenuItem(menuItem: {
    id: number;
    restaurantId: number;
    categoryId: number;
    name: string;
    description: string | null;
    price: number;
    isAvailable: boolean;
    preparationTime: number | null;
  }): RestaurantMenuItemResponseDto {
    return {
      id: menuItem.id,
      restaurantId: menuItem.restaurantId,
      categoryId: menuItem.categoryId,
      name: menuItem.name,
      description: menuItem.description,
      price: menuItem.price,
      isAvailable: menuItem.isAvailable,
      preparationTime: menuItem.preparationTime,
    };
  }

  private mapRestaurant(restaurant: {
    id: number;
    name: string;
    address: string;
    city: string | null;
    latitude: number;
    longitude: number;
    cuisineType?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    deliveryRadiusKm?: number;
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
  }): RestaurantResponseDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      cuisineType: restaurant.cuisineType,
      description: restaurant.description,
      imageUrl: restaurant.imageUrl,
      isActive: restaurant.isActive,
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
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
    };
  }
}
