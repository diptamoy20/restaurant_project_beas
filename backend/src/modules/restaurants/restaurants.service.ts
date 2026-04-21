import { Injectable, NotFoundException } from '@nestjs/common';
import { Restaurant, Category } from '@prisma/client';

import {
  RestaurantCategoryResponseDto,
  RestaurantMenuItemResponseDto,
  RestaurantResponseDto,
  RestaurantTableResponseDto,
} from './dto/restaurant-response.dto';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}
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
  async findNearbyRestaurants(
    latitude: number,
    longitude: number,
    radiusKm = 10,
  ): Promise<RestaurantResponseDto[]> {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: { categories: true },
    });
    return restaurants
      .map((restaurant: Restaurant & { categories: Category[] }) => ({
        ...this.mapRestaurant(restaurant),
        distanceKm: this.calculateDistanceKm(
          latitude,
          longitude,
          restaurant.latitude,
          restaurant.longitude,
        ),
      }))
      .filter((restaurant: RestaurantResponseDto) => restaurant.distanceKm! <= radiusKm)
      .sort((a: RestaurantResponseDto, b: RestaurantResponseDto) => a.distanceKm! - b.distanceKm!);
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
  }): RestaurantResponseDto {
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      city: restaurant.city,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      isActive: restaurant.isActive,
      categories: restaurant.categories.map((category) => this.mapRestaurantCategory(category)),
      tables: restaurant.tables?.map((table) => this.mapRestaurantTable(table)),
      menuItems: restaurant.menuItems?.map((menuItem) => this.mapRestaurantMenuItem(menuItem)),
    };
  }
  private calculateDistanceKm(
    sourceLat: number,
    sourceLng: number,
    targetLat: number,
    targetLng: number,
  ): number {
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const latDistance = toRadians(targetLat - sourceLat);
    const lngDistance = toRadians(targetLng - sourceLng);
    const a =
      Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
      Math.cos(toRadians(sourceLat)) *
        Math.cos(toRadians(targetLat)) *
        Math.sin(lngDistance / 2) *
        Math.sin(lngDistance / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((earthRadiusKm * c).toFixed(2));
  }
}
