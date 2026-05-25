import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

import { CoordinatesQueryDto } from '../../location/dto/coordinates-query.dto';

export class MenuQueryDto extends CoordinatesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by category id',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;
}

export class PaginatedMenuQueryDto extends MenuQueryDto {
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
