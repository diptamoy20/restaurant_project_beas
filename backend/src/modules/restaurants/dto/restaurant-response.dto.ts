import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/pagination.dto';

export class RestaurantCategoryResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 'Starters' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Quick bites and appetizers', nullable: true })
  @IsOptional()
  @IsString()
  description!: string | null;
}

export class RestaurantTableResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 'T1' })
  @IsString()
  tableNumber!: string;

  @ApiPropertyOptional({ example: 'qr-table-t1', nullable: true })
  @IsOptional()
  @IsString()
  qrCode!: string | null;

  @ApiPropertyOptional({ example: 'AVAILABLE', nullable: true })
  @IsOptional()
  @IsString()
  status!: string | null;
}

export class RestaurantMenuItemResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  categoryId!: number;

  @ApiProperty({ example: 'Paneer Burger' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Burger with grilled paneer and house sauce', nullable: true })
  @IsOptional()
  @IsString()
  description!: string | null;

  @ApiProperty({ example: 189 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;

  @ApiPropertyOptional({ example: 18, nullable: true })
  @IsOptional()
  @IsNumber()
  preparationTime!: number | null;

  @ApiPropertyOptional({
    example: [],
  })
  @IsOptional()
  variants?: unknown[];

  @ApiPropertyOptional({
    example: [],
  })
  @IsOptional()
  addonGroups?: unknown[];
}

export class RestaurantResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Downtown Spice Hub' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '45 Residency Road' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 'Bengaluru', nullable: true })
  @IsOptional()
  @IsString()
  city!: string | null;

  @ApiProperty({ example: 12.9663 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 77.6012 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 'North Indian, Chinese', nullable: true })
  @IsOptional()
  @IsString()
  cuisineType?: string | null;

  @ApiPropertyOptional({
    example: 'Popular restaurant serving authentic North Indian and Chinese cuisine',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/restaurant-image.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({ type: () => RestaurantCategoryResponseDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantCategoryResponseDto)
  categories!: RestaurantCategoryResponseDto[];

  @ApiPropertyOptional({ type: () => RestaurantTableResponseDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantTableResponseDto)
  tables?: RestaurantTableResponseDto[];

  @ApiPropertyOptional({ type: () => RestaurantMenuItemResponseDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantMenuItemResponseDto)
  menuItems?: RestaurantMenuItemResponseDto[];

  @ApiPropertyOptional({ example: 0.95 })
  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  deliveryAvailable?: boolean;

  @ApiPropertyOptional({ example: 32 })
  @IsOptional()
  @IsNumber()
  estimatedDeliveryTimeMinutes?: number;

  @ApiPropertyOptional({ example: 38 })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiPropertyOptional({ example: 199, nullable: true })
  @IsOptional()
  @IsNumber()
  minimumOrderAmount?: number | null;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  deliveryRadiusKm?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  deliveryEnabled?: boolean;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  deliveryBaseFee?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  deliveryBaseDistanceKm?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsNumber()
  deliveryPerKmFee?: number;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  @IsNumber()
  deliveryFeeMin?: number | null;

  @ApiPropertyOptional({ example: 99, nullable: true })
  @IsOptional()
  @IsNumber()
  deliveryFeeCap?: number | null;

  @ApiPropertyOptional({ example: 499, nullable: true })
  @IsOptional()
  @IsNumber()
  freeDeliveryMinAmount?: number | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  packagingCharge?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isLocationEnabled?: boolean;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  availableMenuItemsCount?: number;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5', nullable: true })
  @IsOptional()
  @IsString()
  gstin?: string | null;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  gstRate?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  gstEnabled?: boolean;
}

export class PaginatedRestaurantResponseDto extends PaginationMetaDto {
  @ApiProperty({ type: () => RestaurantResponseDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestaurantResponseDto)
  items!: RestaurantResponseDto[];
}
