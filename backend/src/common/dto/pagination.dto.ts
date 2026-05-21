import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
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
  const offset = Math.max(0, Math.trunc(query?.offset ?? defaults.offset ?? 0));
  const maxLimit = defaults.maxLimit ?? 50;
  const limit = Math.min(maxLimit, Math.max(1, Math.trunc(query?.limit ?? defaults.limit ?? 20)));

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
