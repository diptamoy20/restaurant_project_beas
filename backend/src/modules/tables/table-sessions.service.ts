import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TableSessionStatus } from '@prisma/client';

import { TableSessionResponseDto } from './dto/table-response.dto';
import { generateSecureToken } from './utils/token.util';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import {
  TABLES_PAGINATION_MAX_LIMIT,
  TABLES_PAGINATION_DEFAULT_LIMIT,
} from '../../common/constants/pagination';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TableSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateActiveSession(tableId: number, restaurantId: number) {
    const existing = await this.prisma.tableSession.findFirst({
      where: {
        tableId,
        restaurantId,
        status: TableSessionStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.tableSession.create({
      data: {
        tableId,
        restaurantId,
        sessionToken: generateSecureToken('sess'),
        status: TableSessionStatus.ACTIVE,
      },
    });
  }

  async listSessions(query: {
    restaurantId?: number;
    status?: TableSessionStatus;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResult<TableSessionResponseDto>> {
    const pagination = normalizePagination(query, {
      limit: TABLES_PAGINATION_DEFAULT_LIMIT,
      maxLimit: TABLES_PAGINATION_MAX_LIMIT,
    });
    const where = {
      ...(query.restaurantId ? { restaurantId: query.restaurantId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, sessions] = await Promise.all([
      this.prisma.tableSession.count({ where }),
      this.prisma.tableSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        include: {
          restaurant: { select: { name: true } },
          table: { select: { tableNumber: true } },
          _count: { select: { orders: true } },
        },
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: sessions.map((session) => ({
        id: session.id,
        restaurantId: session.restaurantId,
        restaurantName: session.restaurant.name,
        tableId: session.tableId,
        tableNumber: session.table.tableNumber,
        sessionToken: session.sessionToken,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        orderCount: session._count.orders,
      })),
      ...buildPaginationMeta(total, pagination),
    };
  }

  async getSessionById(sessionId: number): Promise<TableSessionResponseDto> {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: sessionId },
      include: {
        restaurant: { select: { name: true } },
        table: { select: { tableNumber: true } },
        _count: { select: { orders: true } },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return {
      id: session.id,
      restaurantId: session.restaurantId,
      restaurantName: session.restaurant.name,
      tableId: session.tableId,
      tableNumber: session.table.tableNumber,
      sessionToken: session.sessionToken,
      status: session.status,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      orderCount: session._count.orders,
    };
  }

  async closeSession(sessionId: number): Promise<TableSessionResponseDto> {
    const session = await this.prisma.tableSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.status === TableSessionStatus.CLOSED) {
      throw new BadRequestException('Session is already closed');
    }

    const closed = await this.prisma.tableSession.update({
      where: { id: sessionId },
      data: {
        status: TableSessionStatus.CLOSED,
        endedAt: new Date(),
      },
      include: {
        restaurant: { select: { name: true } },
        table: { select: { tableNumber: true } },
        _count: { select: { orders: true } },
      },
    });

    return {
      id: closed.id,
      restaurantId: closed.restaurantId,
      restaurantName: closed.restaurant.name,
      tableId: closed.tableId,
      tableNumber: closed.table.tableNumber,
      sessionToken: closed.sessionToken,
      status: closed.status,
      startedAt: closed.startedAt,
      endedAt: closed.endedAt,
      orderCount: closed._count.orders,
    };
  }
}
