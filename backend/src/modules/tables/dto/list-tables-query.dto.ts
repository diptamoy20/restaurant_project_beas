import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import {
  TABLES_PAGINATION_DEFAULT_LIMIT,
  TABLES_PAGINATION_MAX_LIMIT,
} from '../../../common/constants/pagination';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class ListTablesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 100,
    default: TABLES_PAGINATION_DEFAULT_LIMIT,
    minimum: 1,
    maximum: TABLES_PAGINATION_MAX_LIMIT,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(TABLES_PAGINATION_MAX_LIMIT)
  limit?: number = TABLES_PAGINATION_DEFAULT_LIMIT;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId?: number;
}
