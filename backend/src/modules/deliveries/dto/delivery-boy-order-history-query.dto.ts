import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class DeliveryBoyOrderHistoryQueryDto {
  @ApiPropertyOptional({
    example: '2026-06-03',
    description:
      'Calendar date (YYYY-MM-DD). Defaults to today when omitted. Filters by order deliveredAt.',
  })
  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    minimum: 1,
    description: 'Page number (1-based). Page size is fixed on the server.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;
}

/** Server-controlled page size for delivery agent order history. */
export const DELIVERY_ORDER_HISTORY_PAGE_SIZE = 20;

export function normalizeOrderHistoryPage(page?: number): {
  page: number;
  offset: number;
  limit: number;
} {
  const normalizedPage = Math.max(1, Math.trunc(page ?? 1));

  return {
    page: normalizedPage,
    offset: (normalizedPage - 1) * DELIVERY_ORDER_HISTORY_PAGE_SIZE,
    limit: DELIVERY_ORDER_HISTORY_PAGE_SIZE,
  };
}

export function buildOrderHistoryPaginationMeta(
  total: number,
  page: number,
  pageSize: number = DELIVERY_ORDER_HISTORY_PAGE_SIZE,
): {
  page: number;
  pageSize: number;
  totalPages: number;
  total: number;
} {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    page,
    pageSize,
    totalPages,
    total,
  };
}

export function resolveOrderHistoryCalendarDate(date?: string): string {
  if (date) {
    return date;
  }

  return new Date().toISOString().slice(0, 10);
}

export function getOrderHistoryDayBounds(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Invalid calendar date');
  }

  return { start, end };
}
