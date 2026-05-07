import { Injectable, NotFoundException } from '@nestjs/common';
import { Restaurant, Category } from '@prisma/client';

import {
  RestaurantCategoryResponseDto,
  RestaurantMenuItemResponseDto,
  RestaurantResponseDto,
  RestaurantTableResponseDto,
} from './dto/restaurant-response.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { LocationService } from '../location/location.service';
@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}
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
    deliveryRadiusKm?: number;
    isLocationEnabled?: boolean;
    isActive: boolean;
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
