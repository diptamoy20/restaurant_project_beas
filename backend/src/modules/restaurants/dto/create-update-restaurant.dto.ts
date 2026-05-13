import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

/**
 * DTO for creating a new restaurant
 */
export class CreateRestaurantDto {
  @ApiProperty({ example: 'Downtown Spice Hub' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '45 Residency Road, Bangalore' })
  @IsNotEmpty()
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ example: 12.9663, description: 'Latitude of restaurant location' })
  @IsNotEmpty()
  @IsLatitude()
  @Type(() => Number)
  latitude!: number;

  @ApiProperty({ example: 77.6012, description: 'Longitude of restaurant location' })
  @IsNotEmpty()
  @IsLongitude()
  @Type(() => Number)
  longitude!: number;

  @ApiPropertyOptional({ example: 'North Indian, Chinese' })
  @IsOptional()
  @IsString()
  cuisineType?: string;

  @ApiPropertyOptional({
    example: 'Popular restaurant serving authentic North Indian and Chinese cuisine',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/restaurant-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Delivery radius in kilometers',
    minimum: 0.1,
    default: 8,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  deliveryRadiusKm?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether location-based delivery is enabled',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isLocationEnabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether restaurant is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating a restaurant
 */
export class UpdateRestaurantDto {
  @ApiPropertyOptional({ example: 'Downtown Spice Hub' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '45 Residency Road, Bangalore' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 12.9663, description: 'Latitude of restaurant location' })
  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.6012, description: 'Longitude of restaurant location' })
  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ example: 'North Indian, Chinese' })
  @IsOptional()
  @IsString()
  cuisineType?: string;

  @ApiPropertyOptional({
    example: 'Popular restaurant serving authentic North Indian and Chinese cuisine',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/restaurant-image.jpg',
  })
  @IsOptional()
  @IsUrl()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Delivery radius in kilometers',
    minimum: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Type(() => Number)
  deliveryRadiusKm?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether location-based delivery is enabled',
  })
  @IsOptional()
  @IsBoolean()
  isLocationEnabled?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether restaurant is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
