import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CouponQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  restaurantId?: number;

  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], example: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive', 'all'])
  status?: string;

  @ApiPropertyOptional({ example: 'WELCOME' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateCouponDto {
  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  restaurantId?: number;

  @ApiProperty({
    example: 'WELCOME50',
    description:
      'Unique within the selected restaurant scope. Same code may be reused for another restaurant.',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @ApiPropertyOptional({ example: 'Welcome discount for first order' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ['PERCENTAGE', 'FLAT'], example: 'PERCENTAGE' })
  @IsIn(['PERCENTAGE', 'FLAT'])
  discountType!: string;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  discountValue!: number;

  @ApiPropertyOptional({ example: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 299 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: '2026-05-25T00:00:00.000Z' })
  @IsOptional()
  @IsString()
  startsAt?: string;

  @ApiPropertyOptional({ example: '2026-06-25T23:59:59.000Z' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 500 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitTotal?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponDto extends CreateCouponDto {
  @ApiPropertyOptional({
    example: 'WELCOME50',
    description:
      'Unique within the selected restaurant scope. Same code may be reused for another restaurant.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  code!: string;

  @ApiPropertyOptional({ enum: ['PERCENTAGE', 'FLAT'], example: 'PERCENTAGE' })
  @IsOptional()
  @IsIn(['PERCENTAGE', 'FLAT'])
  discountType!: string;

  @ApiPropertyOptional({ example: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discountValue!: number;
}

export class BulkCreateCouponsDto extends CreateCouponDto {
  @ApiProperty({
    example: [1, 2, 3],
    description: 'Restaurant ids that should receive this coupon code.',
    type: [Number],
  })
  @Type(() => Number)
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(1, { each: true })
  restaurantIds!: number[];
}

export class CouponResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  restaurantId!: number | null;

  @ApiProperty({ example: 'WELCOME50' })
  code!: string;

  @ApiPropertyOptional({ example: 'Welcome discount', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'PERCENTAGE' })
  discountType!: string;

  @ApiProperty({ example: 10 })
  discountValue!: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  maxDiscountAmount!: number | null;

  @ApiPropertyOptional({ example: 299, nullable: true })
  minOrderAmount!: number | null;

  @ApiPropertyOptional({ nullable: true })
  startsAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  expiresAt!: Date | null;

  @ApiPropertyOptional({ example: 500, nullable: true })
  usageLimitTotal!: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  usageLimitPerUser!: number | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 0 })
  usageCount!: number;
}
