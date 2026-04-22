import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

type RateLimitBucket = {
  startedAt: number;
  count: number;
};

type RequestWithRoute = Request & { route?: { path?: string } };

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateLimitBucket>();

  private readonly windowMs = this.parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);

  private readonly maxRequests = this.parsePositiveInt(process.env.RATE_LIMIT_MAX_REQUESTS, 120);

  use(request: RequestWithRoute, response: Response, next: NextFunction): void {
    if (this.shouldSkip(request.path)) {
      next();
      return;
    }

    const key = this.buildKey(request);
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.startedAt >= this.windowMs) {
      this.buckets.set(key, { startedAt: now, count: 1 });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > this.maxRequests) {
      response.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
      });
      return;
    }

    next();
  }

  private shouldSkip(path: string): boolean {
    return (
      path.includes('/health') || path.includes('/api/docs') || path.includes('/api/openapi.json')
    );
  }

  private buildKey(request: RequestWithRoute): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    const source =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : (request.ip ?? request.socket.remoteAddress ?? 'unknown');

    const routePath = request.route?.path ?? request.path;

    return `${source}:${request.method}:${routePath}`;
  }

  private parsePositiveInt(rawValue: string | undefined, fallback: number): number {
    if (!rawValue) {
      return fallback;
    }

    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }
}
