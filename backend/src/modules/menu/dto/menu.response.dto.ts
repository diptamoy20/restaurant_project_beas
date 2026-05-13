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

import { MenuItemDto } from './menu-item.dto';
import { DeliveryQuoteDto } from '../../location/dto/location-response.dto';

export class MenuRestaurantSummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Downtown Spice Hub' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '45 Residency Road' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  city!: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  imageUrl!: string | null;
}

export class MenuCategoryGroupDto {
  @ApiProperty({ example: 'Pizza' })
  @IsString()
  name!: string;

  @ApiProperty({ type: () => MenuItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuItemDto)
  items!: MenuItemDto[];
}

export class MenuResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ type: () => MenuRestaurantSummaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MenuRestaurantSummaryDto)
  restaurant?: MenuRestaurantSummaryDto;

  @ApiPropertyOptional({ type: () => MenuCategoryGroupDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuCategoryGroupDto)
  categories?: MenuCategoryGroupDto[];

  @ApiProperty({ type: () => MenuItemDto, isArray: true })
  @IsArray()
  items!: MenuItemDto[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  deliveryAvailable?: boolean;

  @ApiProperty({ example: 2.4, required: false })
  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @ApiProperty({ example: 32, required: false })
  @IsOptional()
  @IsNumber()
  estimatedDeliveryTimeMinutes?: number;

  @ApiProperty({ example: 38, required: false })
  @IsOptional()
  @IsNumber()
  deliveryFee?: number;

  @ApiProperty({ type: () => DeliveryQuoteDto, required: false })
  @IsOptional()
  delivery?: DeliveryQuoteDto;
}
