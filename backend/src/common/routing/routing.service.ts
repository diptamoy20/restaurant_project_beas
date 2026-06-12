import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { GeoCacheService } from '../cache/geo-cache.service';

const ROUTE_CACHE_TTL_SECONDS = 60;

export type RouteLocation = {
  latitude: number;
  longitude: number;
};

export type RouteStopType = 'RESTAURANT' | 'CUSTOMER';

export type RouteDistanceResult = {
  distanceKm: number;
  durationMinutes: number | null;
  source: 'ROUTE' | 'AIR_DISTANCE_FALLBACK';
  provider: 'OSRM' | 'NONE';
};

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly routingEnabled: boolean;
  private readonly routingProvider: string;
  private readonly routingBaseUrl: string;
  private readonly routingTimeoutMs: number;
  private readonly routingProfile: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cache: GeoCacheService,
  ) {
    this.routingEnabled = this.configService.get<boolean>('ROUTING_ENABLED') ?? true;
    this.routingProvider = (
      this.configService.get<string>('ROUTING_PROVIDER') ?? 'osrm'
    ).toLowerCase();
    this.routingBaseUrl = (
      this.configService.get<string>('ROUTING_BASE_URL') ?? 'https://router.project-osrm.org'
    ).replace(/\/$/, '');
    this.routingTimeoutMs = this.configService.get<number>('ROUTING_TIMEOUT_MS') ?? 5000;
    this.routingProfile = this.configService.get<string>('ROUTING_OSRM_PROFILE') ?? 'driving';
  }

  async getShortestRoute(
    origin: RouteLocation,
    destination: RouteLocation,
  ): Promise<RouteDistanceResult> {
    const airDistanceKm = this.getAirDistanceKm(origin, destination);

    if (!this.routingEnabled) {
      return this.buildAirDistanceFallback(airDistanceKm);
    }

    const cacheKey = this.buildCacheKey(origin, destination);
    const cached = await this.cache.get<RouteDistanceResult>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await this.fetchRoute(origin, destination);
      await this.cache.set(cacheKey, result, ROUTE_CACHE_TTL_SECONDS);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Falling back to air distance for route lookup: ${message}`);
      const fallback = this.buildAirDistanceFallback(airDistanceKm);
      await this.cache.set(cacheKey, fallback, ROUTE_CACHE_TTL_SECONDS);
      return fallback;
    }
  }

  private async fetchRoute(
    origin: RouteLocation,
    destination: RouteLocation,
  ): Promise<RouteDistanceResult> {
    if (this.routingProvider !== 'osrm') {
      throw new Error(`Unsupported routing provider: ${this.routingProvider}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.routingTimeoutMs);

    try {
      const url =
        `${this.routingBaseUrl}/route/v1/${this.routingProfile}/` +
        `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
        '?alternatives=false&steps=false&overview=false';
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Routing provider responded with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        code?: string;
        routes?: Array<{
          distance?: number;
          duration?: number;
        }>;
      };
      const route = payload.routes?.[0];

      if (payload.code !== 'Ok' || !route || !Number.isFinite(route.distance)) {
        throw new Error('Routing provider returned no valid route');
      }

      return {
        distanceKm: this.roundTo(route.distance! / 1000, 2),
        durationMinutes: Number.isFinite(route.duration)
          ? this.roundTo((route.duration ?? 0) / 60, 1)
          : null,
        source: 'ROUTE',
        provider: 'OSRM',
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildAirDistanceFallback(distanceKm: number): RouteDistanceResult {
    return {
      distanceKm,
      durationMinutes: null,
      source: 'AIR_DISTANCE_FALLBACK',
      provider: 'NONE',
    };
  }

  private buildCacheKey(origin: RouteLocation, destination: RouteLocation): string {
    return [
      'route',
      this.routingProvider,
      this.routingProfile,
      origin.latitude.toFixed(4),
      origin.longitude.toFixed(4),
      destination.latitude.toFixed(4),
      destination.longitude.toFixed(4),
    ].join(':');
  }

  private getAirDistanceKm(origin: RouteLocation, destination: RouteLocation): number {
    const earthRadiusKm = 6371;
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const latitudeDelta = toRadians(destination.latitude - origin.latitude);
    const longitudeDelta = toRadians(destination.longitude - origin.longitude);
    const fromLatitudeRadians = toRadians(origin.latitude);
    const toLatitudeRadians = toRadians(destination.latitude);
    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(fromLatitudeRadians) *
        Math.cos(toLatitudeRadians) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distance = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return this.roundTo(distance, 2);
  }

  private roundTo(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }
}
