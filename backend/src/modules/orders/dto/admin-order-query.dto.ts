import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AdminOrderQueryDto {
  @ApiPropertyOptional({ enum: ['recent', 'last_1_hour', 'last_3_hours'], default: 'recent' })
  @IsOptional()
  @IsString()
  @IsIn(['recent', 'last_1_hour', 'last_3_hours'])
  timeRange?: string;

  @ApiPropertyOptional({ enum: ['DINE_IN', 'DELIVERY'] })
  @IsOptional()
  @IsString()
  @IsIn(['DINE_IN', 'DELIVERY'])
  type?: string;

  @ApiPropertyOptional({ enum: ['CASH', 'UPI', 'CARD'] })
  @IsOptional()
  @IsString()
  @IsIn(['CASH', 'UPI', 'CARD'])
  payment?: string;

  @ApiPropertyOptional({
    enum: ['PREPARING', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'SERVED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PREPARING', 'OUT_FOR_DELIVERY', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'SERVED'])
  status?: string;

  @ApiPropertyOptional({ enum: ['ACCEPT', 'REJECT'] })
  @IsOptional()
  @IsString()
  @IsIn(['ACCEPT', 'REJECT'])
  action?: string;

  @ApiPropertyOptional({ example: 'Surojit Bera' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
