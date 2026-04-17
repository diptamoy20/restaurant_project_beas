import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getRestaurants() {
    return this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: {
        categories: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getRestaurant(id: number) {
    return this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        categories: true,
        tables: true,
        menuItems: true,
      },
    });
  }

  async findNearbyRestaurants(latitude: number, longitude: number, radiusKm = 10) {
    const restaurants = await this.prisma.restaurant.findMany({
      where: { isActive: true },
      include: {
        categories: true,
      },
    });

    return restaurants
      .map((restaurant: (typeof restaurants)[number]) => ({
        ...restaurant,
        distanceKm: this.calculateDistanceKm(
          latitude,
          longitude,
          restaurant.latitude,
          restaurant.longitude,
        ),
      }))
      .filter(
        (restaurant: (typeof restaurants)[number] & { distanceKm: number }) =>
          restaurant.distanceKm <= radiusKm,
      )
      .sort(
        (
          a: (typeof restaurants)[number] & { distanceKm: number },
          b: (typeof restaurants)[number] & { distanceKm: number },
        ) => a.distanceKm - b.distanceKm,
      );
  }

  private calculateDistanceKm(
    sourceLat: number,
    sourceLng: number,
    targetLat: number,
    targetLng: number,
  ) {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
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
