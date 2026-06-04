import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

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

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
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
