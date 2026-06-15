import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { Prisma, TableSessionStatus } from '@prisma/client';

import { CreateTableDto } from './dto/create-table.dto';
import { ListTablesQueryDto } from './dto/list-tables-query.dto';
import { TableResolutionResponseDto, TableResponseDto } from './dto/table-response.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { QrCodeService } from './qr-code.service';
import { TableSessionsService } from './table-sessions.service';
import { generateSecureToken } from './utils/token.util';
import {
  TABLES_PAGINATION_MAX_LIMIT,
  TABLES_PAGINATION_DEFAULT_LIMIT,
} from '../../common/constants/pagination';
import {
  buildPaginationMeta,
  normalizePagination,
  PaginatedResult,
  toPrismaPagination,
} from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

type TableWithRelations = Prisma.RestaurantTableGetPayload<{
  include: {
    restaurant: { select: { name: true; isActive: true; description: true } };
    sessions: {
      where: { status: TableSessionStatus };
      take: 1;
      orderBy: { startedAt: 'desc' };
    };
  };
}>;

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrCodeService: QrCodeService,
    private readonly tableSessionsService: TableSessionsService,
  ) {}

  async listTables(query: ListTablesQueryDto): Promise<PaginatedResult<TableResponseDto>> {
    const pagination = normalizePagination(query, {
      limit: TABLES_PAGINATION_DEFAULT_LIMIT,
      maxLimit: TABLES_PAGINATION_MAX_LIMIT,
    });
    const where: Prisma.RestaurantTableWhereInput = query.restaurantId
      ? { restaurantId: query.restaurantId }
      : {};

    const [total, tables] = await Promise.all([
      this.prisma.restaurantTable.count({ where }),
      this.prisma.restaurantTable.findMany({
        where,
        orderBy: [{ restaurantId: 'asc' }, { tableNumber: 'asc' }],
        include: {
          restaurant: { select: { name: true, isActive: true, description: true } },
          sessions: {
            where: { status: TableSessionStatus.ACTIVE },
            take: 1,
            orderBy: { startedAt: 'desc' },
          },
        },
        ...toPrismaPagination(pagination),
      }),
    ]);

    return {
      items: tables.map((table) => this.mapTable(table)),
      ...buildPaginationMeta(total, pagination),
    };
  }

  async getTableById(tableId: number): Promise<TableResponseDto> {
    const table = await this.findTableOrThrow(tableId);
    return this.mapTable(table);
  }

  async createTable(dto: CreateTableDto): Promise<TableResponseDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const duplicate = await this.prisma.restaurantTable.findFirst({
      where: {
        restaurantId: dto.restaurantId,
        tableNumber: dto.tableNumber.trim(),
      },
    });

    if (duplicate) {
      throw new BadRequestException('Table number already exists for this restaurant');
    }

    const tableToken = generateSecureToken('tbl');
    const qrCodeUrl = this.qrCodeService.buildTableQrUrl(tableToken);

    const table = await this.prisma.restaurantTable.create({
      data: {
        restaurantId: dto.restaurantId,
        tableNumber: dto.tableNumber.trim(),
        capacity: dto.capacity,
        status: 'AVAILABLE',
        tableToken,
        qrCodeUrl,
        qrCode: tableToken,
      },
      include: {
        restaurant: { select: { name: true, isActive: true, description: true } },
        sessions: {
          where: { status: TableSessionStatus.ACTIVE },
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    return this.mapTable(table);
  }

  async updateTable(tableId: number, dto: UpdateTableDto): Promise<TableResponseDto> {
    const existing = await this.findTableOrThrow(tableId);

    if (dto.tableNumber && dto.tableNumber.trim() !== existing.tableNumber) {
      const duplicate = await this.prisma.restaurantTable.findFirst({
        where: {
          restaurantId: existing.restaurantId,
          tableNumber: dto.tableNumber.trim(),
          NOT: { id: tableId },
        },
      });

      if (duplicate) {
        throw new BadRequestException('Table number already exists for this restaurant');
      }
    }

    const table = await this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        ...(dto.tableNumber ? { tableNumber: dto.tableNumber.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: {
        restaurant: { select: { name: true, isActive: true, description: true } },
        sessions: {
          where: { status: TableSessionStatus.ACTIVE },
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    return this.mapTable(table);
  }

  async deleteTable(tableId: number): Promise<void> {
    await this.findTableOrThrow(tableId);

    const activeSession = await this.prisma.tableSession.findFirst({
      where: { tableId, status: TableSessionStatus.ACTIVE },
    });

    if (activeSession) {
      throw new BadRequestException('Cannot delete a table with an active session');
    }

    await this.prisma.restaurantTable.delete({ where: { id: tableId } });
  }

  async generateQr(tableId: number, regenerate = false): Promise<TableResponseDto> {
    const table = await this.findTableOrThrow(tableId);

    if (table.tableToken && table.qrCodeUrl && !regenerate) {
      return this.mapTable(table);
    }

    const tableToken = regenerate
      ? generateSecureToken('tbl')
      : (table.tableToken ?? generateSecureToken('tbl'));
    const qrCodeUrl = this.qrCodeService.buildTableQrUrl(tableToken);

    const updated = await this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        tableToken,
        qrCodeUrl,
        qrCode: tableToken,
      },
      include: {
        restaurant: { select: { name: true, isActive: true, description: true } },
        sessions: {
          where: { status: TableSessionStatus.ACTIVE },
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    return this.mapTable(updated);
  }

  async downloadQr(
    tableId: number,
    format: 'png' | 'svg' | 'pdf',
  ): Promise<{ file: StreamableFile; fileName: string; contentType: string }> {
    const table = await this.findTableOrThrow(tableId);

    if (!table.tableToken || !table.qrCodeUrl) {
      throw new BadRequestException('QR code has not been generated for this table');
    }

    const label = `${table.restaurant.name} - ${table.tableNumber}`;
    const safeName = `${table.restaurant.name}-${table.tableNumber}`.replace(/[^\w.-]+/g, '_');

    if (format === 'svg') {
      const svg = await this.qrCodeService.renderSvg(table.qrCodeUrl);
      return {
        file: new StreamableFile(Buffer.from(svg, 'utf8')),
        fileName: `${safeName}.svg`,
        contentType: 'image/svg+xml',
      };
    }

    if (format === 'pdf') {
      const pdf = await this.qrCodeService.renderPdf(table.qrCodeUrl, label);
      return {
        file: new StreamableFile(pdf),
        fileName: `${safeName}.pdf`,
        contentType: 'application/pdf',
      };
    }

    const png = await this.qrCodeService.renderPng(table.qrCodeUrl);
    return {
      file: new StreamableFile(png),
      fileName: `${safeName}.png`,
      contentType: 'image/png',
    };
  }

  async resolveTableToken(token: string): Promise<TableResolutionResponseDto> {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { tableToken: token },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            gstEnabled: true,
            gstRate: true,
          },
        },
      },
    });

    if (!table || !table.isActive) {
      throw new NotFoundException('Invalid or inactive table QR code');
    }

    if (!table.restaurant.isActive) {
      throw new NotFoundException('Restaurant is not available');
    }

    const session = await this.tableSessionsService.getOrCreateActiveSession(
      table.id,
      table.restaurantId,
    );

    return {
      restaurantId: table.restaurantId,
      restaurantName: table.restaurant.name,
      restaurantDescription: table.restaurant.description,
      gstEnabled: table.restaurant.gstEnabled,
      gstRate: table.restaurant.gstEnabled ? table.restaurant.gstRate : 0,
      tableId: table.id,
      tableNumber: table.tableNumber,
      sessionId: session.id,
      sessionToken: session.sessionToken,
    };
  }

  private async findTableOrThrow(tableId: number): Promise<TableWithRelations> {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
      include: {
        restaurant: { select: { name: true, isActive: true, description: true } },
        sessions: {
          where: { status: TableSessionStatus.ACTIVE },
          take: 1,
          orderBy: { startedAt: 'desc' },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  private mapTable(table: TableWithRelations): TableResponseDto {
    const activeSession = table.sessions[0];

    return {
      id: table.id,
      restaurantId: table.restaurantId,
      restaurantName: table.restaurant.name,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      tableToken: table.tableToken,
      qrCodeUrl: table.qrCodeUrl,
      hasQr: Boolean(table.tableToken && table.qrCodeUrl),
      hasActiveSession: Boolean(activeSession),
      activeSessionStatus: activeSession?.status ?? null,
      isActive: table.isActive,
      createdAt: table.createdAt,
      updatedAt: table.updatedAt,
    };
  }
}
