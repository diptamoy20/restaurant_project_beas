import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional } from 'class-validator';

import { MenuItemDto } from './menu-item.dto';
import { DeliveryQuoteDto } from '../../location/dto/location-response.dto';

export class MenuResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

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
