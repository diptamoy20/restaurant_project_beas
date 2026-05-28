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
    enum: ['PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'SERVED'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'SERVED'])
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

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
