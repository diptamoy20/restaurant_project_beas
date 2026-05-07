import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

import { CoordinatesQueryDto } from '../../location/dto/coordinates-query.dto';

export class NearbyRestaurantsDto extends CoordinatesQueryDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100, default: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number = 10;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 50, default: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}
