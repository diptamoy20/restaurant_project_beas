import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class BestSellingQueryDto {
  @ApiPropertyOptional({ example: 22.5726, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 88.3639, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ example: 18, minimum: 1, maximum: 48 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(48)
  limit?: number;
}
