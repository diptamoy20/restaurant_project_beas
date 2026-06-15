import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGINATION_LIMIT,
  DEFAULT_PAGINATION_MAX_LIMIT,
  DEFAULT_PAGINATION_OFFSET,
} from '../constants/pagination';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    example: DEFAULT_PAGINATION_LIMIT,
    default: DEFAULT_PAGINATION_LIMIT,
    minimum: 1,
    maximum: DEFAULT_PAGINATION_MAX_LIMIT,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(DEFAULT_PAGINATION_MAX_LIMIT)
  limit?: number = DEFAULT_PAGINATION_LIMIT;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 128 })
  total!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

export type NormalizedPagination = {
  limit: number;
  offset: number;
};

export type PrismaPagination = {
  skip: number;
  take: number;
};

export type PaginatedResult<T> = PaginationMetaDto & {
  items: T[];
};

export function normalizePagination(
  query?: { offset?: number; limit?: number },
  defaults: { offset?: number; limit?: number; maxLimit?: number } = {},
): NormalizedPagination {
  const offset = Math.max(
    0,
    Math.trunc(query?.offset ?? defaults.offset ?? DEFAULT_PAGINATION_OFFSET),
  );
  const maxLimit = defaults.maxLimit ?? DEFAULT_PAGINATION_MAX_LIMIT;
  const limit = Math.min(
    maxLimit,
    Math.max(1, Math.trunc(query?.limit ?? defaults.limit ?? DEFAULT_PAGINATION_LIMIT)),
  );

  return {
    limit,
    offset,
  };
}

export function buildPaginationMeta(
  total: number,
  pagination: Pick<NormalizedPagination, 'offset' | 'limit'>,
): PaginationMetaDto {
  return {
    total,
    limit: pagination.limit,
    offset: pagination.offset,
    hasNextPage: pagination.offset + pagination.limit < total,
    hasPreviousPage: pagination.offset > 0,
  };
}

export function toPrismaPagination(
  pagination: Pick<NormalizedPagination, 'offset' | 'limit'>,
): PrismaPagination {
  return {
    skip: pagination.offset,
    take: pagination.limit,
  };
}
