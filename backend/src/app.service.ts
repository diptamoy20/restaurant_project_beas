import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { HealthResponseDto } from './dto/health-response.dto';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponseDto> {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);

      return {
        status: 'ok',
        service: 'restaurant-backend',
        timestamp,
        database: 'up',
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'restaurant-backend',
        timestamp,
        database: 'down',
      });
    }
  }
}
