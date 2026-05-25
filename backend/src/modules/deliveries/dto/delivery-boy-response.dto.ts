import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { DeliveryTrackingLogDto } from './delivery-tracking-log.dto';
import { PaginationMetaDto } from '../../../common/dto/pagination.dto';

export class DeliveryBoyProfileDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Surojit Bera' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  phone!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;
}

export class DeliveryBoyStatsDto {
  @ApiProperty({ example: 8 })
  @IsNumber()
  assigned!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  onTheWay!: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  delivered!: number;
}

export class DeliveryBoyOrderCardDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  deliveryId!: number;

  @ApiProperty({ example: 1025 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'ORD-1001' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: '2026-05-25T07:30:00.000Z' })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ example: 2 })
  @IsNumber()
  minutesAgo!: number;

  @ApiPropertyOptional({ example: 'Rahul Sharma', nullable: true })
  @IsOptional()
  @IsString()
  customerName!: string | null;

  @ApiPropertyOptional({ example: '+919876543210', nullable: true })
  @IsOptional()
  @IsString()
  customerPhone!: string | null;

  @ApiPropertyOptional({ example: 'Salt Lake, Sector 1, Kolkata, West Bengal', nullable: true })
  @IsOptional()
  @IsString()
  addressText!: string | null;

  @ApiProperty({ example: 5 })
  @IsNumber()
  itemCount!: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  totalQuantity!: number;

  @ApiProperty({ example: 650 })
  @IsNumber()
  finalAmount!: number;

  @ApiPropertyOptional({ example: 'COD', nullable: true })
  @IsOptional()
  @IsString()
  paymentMethod!: string | null;

  @ApiProperty({ example: 'PENDING' })
  @IsString()
  paymentStatus!: string;

  @ApiProperty({ example: 'ASSIGNED' })
  @IsString()
  deliveryStatus!: string;

  @ApiProperty({ example: 'ACCEPTED' })
  @IsString()
  orderStatus!: string;
}

export class DeliveryBoyDashboardDto {
  @ApiProperty({ type: () => DeliveryBoyProfileDto })
  @ValidateNested()
  @Type(() => DeliveryBoyProfileDto)
  profile!: DeliveryBoyProfileDto;

  @ApiProperty({ type: () => DeliveryBoyStatsDto })
  @ValidateNested()
  @Type(() => DeliveryBoyStatsDto)
  stats!: DeliveryBoyStatsDto;

  @ApiProperty({ type: () => DeliveryBoyOrderCardDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryBoyOrderCardDto)
  assignedOrders!: DeliveryBoyOrderCardDto[];
}

export class PaginatedDeliveryBoyOrderCardsDto extends PaginationMetaDto {
  @ApiProperty({ type: () => DeliveryBoyOrderCardDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryBoyOrderCardDto)
  items!: DeliveryBoyOrderCardDto[];
}

export class DeliveryBoyOrderHeaderDto {
  @ApiProperty({ example: 1025 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'ORD-1001' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'OUT_FOR_DELIVERY' })
  @IsString()
  status!: string;

  @ApiProperty({ example: '2026-05-25T07:30:00.000Z' })
  @IsDate()
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-05-25T07:32:00.000Z', nullable: true })
  @IsOptional()
  acceptedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-05-25T07:45:00.000Z', nullable: true })
  @IsOptional()
  preparedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-05-25T08:00:00.000Z', nullable: true })
  @IsOptional()
  deliveredAt!: Date | null;
}

export class DeliveryBoyAddressDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Home' })
  @IsString()
  label!: string;

  @ApiProperty({ example: 'Salt Lake, Sector 1, Block - B' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 'Kolkata', nullable: true })
  @IsOptional()
  @IsString()
  city!: string | null;

  @ApiPropertyOptional({ example: 'West Bengal', nullable: true })
  @IsOptional()
  @IsString()
  state!: string | null;

  @ApiProperty({ example: 22.5726 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 88.3639 })
  @IsNumber()
  longitude!: number;

  @ApiProperty({ example: 'Salt Lake, Sector 1, Block - B, Kolkata, West Bengal' })
  @IsString()
  fullText!: string;
}

export class DeliveryBoyCustomerDto {
  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  id!: number | null;

  @ApiPropertyOptional({ example: 'Rahul Sharma', nullable: true })
  @IsOptional()
  @IsString()
  name!: string | null;

  @ApiPropertyOptional({ example: '+919876543210', nullable: true })
  @IsOptional()
  @IsString()
  phone!: string | null;

  @ApiPropertyOptional({ example: '/uploads/profile-images/avatar.jpg', nullable: true })
  @IsOptional()
  @IsString()
  profileImageUrl!: string | null;

  @ApiPropertyOptional({ type: () => DeliveryBoyAddressDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryBoyAddressDto)
  address!: DeliveryBoyAddressDto | null;
}

export class DeliveryBoyRestaurantDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Downtown Spice Hub' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '45 Residency Road' })
  @IsString()
  address!: string;

  @ApiPropertyOptional({ example: 'Kolkata', nullable: true })
  @IsOptional()
  @IsString()
  city!: string | null;

  @ApiProperty({ example: 22.5726 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 88.3639 })
  @IsNumber()
  longitude!: number;
}

export class DeliveryBoyItemsSummaryDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  itemCount!: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  totalQuantity!: number;
}

export class DeliveryBoyOrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 12 })
  @IsNumber()
  menuItemId!: number;

  @ApiProperty({ example: 'Margherita Pizza' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: '/uploads/pizza.jpg', nullable: true })
  @IsOptional()
  @IsString()
  imageUrl!: string | null;

  @ApiPropertyOptional({ example: 'Regular', nullable: true })
  @IsOptional()
  @IsString()
  variantName!: string | null;

  @ApiProperty({ example: ['Extra Cheese'], isArray: true })
  @IsArray()
  @IsString({ each: true })
  addons!: string[];

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 250 })
  @IsNumber()
  unitPrice!: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  totalPrice!: number;
}

export class DeliveryBoyBillingDto {
  @ApiProperty({ example: 840 })
  @IsNumber()
  itemTotal!: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  deliveryCharge!: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  packagingCharge!: number;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  @IsNumber()
  discountAmount!: number | null;

  @ApiProperty({ example: 40 })
  @IsNumber()
  taxAmount!: number;

  @ApiProperty({ example: 900 })
  @IsNumber()
  totalAmount!: number;

  @ApiProperty({ example: 900 })
  @IsNumber()
  finalAmount!: number;

  @ApiPropertyOptional({ example: 'COD', nullable: true })
  @IsOptional()
  @IsString()
  paymentMethod!: string | null;

  @ApiProperty({ example: 'PENDING' })
  @IsString()
  paymentStatus!: string;
}

export class DeliveryBoyDeliveryDto {
  @ApiProperty({ example: 'ON_THE_WAY' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  estimatedDeliveryMinutes!: number;

  @ApiProperty({ example: '12:45 PM - 1:00 PM' })
  @IsString()
  estimatedDeliveryWindow!: string;

  @ApiPropertyOptional({ example: 3.2, nullable: true })
  @IsOptional()
  @IsNumber()
  distanceKm!: number | null;

  @ApiPropertyOptional({ type: () => DeliveryTrackingLogDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryTrackingLogDto)
  latestLocation!: DeliveryTrackingLogDto | null;
}

export class DeliveryBoyOrderActionsDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  canAccept!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  canMarkOutForDelivery!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canMarkOnTheWay!: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  canMarkDelivered!: boolean;
}

export class DeliveryBoyOrderDetailsDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  deliveryId!: number;

  @ApiProperty({ type: () => DeliveryBoyOrderHeaderDto })
  @ValidateNested()
  @Type(() => DeliveryBoyOrderHeaderDto)
  order!: DeliveryBoyOrderHeaderDto;

  @ApiProperty({ type: () => DeliveryBoyCustomerDto })
  @ValidateNested()
  @Type(() => DeliveryBoyCustomerDto)
  customer!: DeliveryBoyCustomerDto;

  @ApiProperty({ type: () => DeliveryBoyRestaurantDto })
  @ValidateNested()
  @Type(() => DeliveryBoyRestaurantDto)
  restaurant!: DeliveryBoyRestaurantDto;

  @ApiProperty({ type: () => DeliveryBoyItemsSummaryDto })
  @ValidateNested()
  @Type(() => DeliveryBoyItemsSummaryDto)
  itemsSummary!: DeliveryBoyItemsSummaryDto;

  @ApiProperty({ type: () => DeliveryBoyOrderItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryBoyOrderItemDto)
  items!: DeliveryBoyOrderItemDto[];

  @ApiProperty({ type: () => DeliveryBoyBillingDto })
  @ValidateNested()
  @Type(() => DeliveryBoyBillingDto)
  billing!: DeliveryBoyBillingDto;

  @ApiProperty({ type: () => DeliveryBoyDeliveryDto })
  @ValidateNested()
  @Type(() => DeliveryBoyDeliveryDto)
  delivery!: DeliveryBoyDeliveryDto;

  @ApiProperty({ type: () => DeliveryBoyOrderActionsDto })
  @ValidateNested()
  @Type(() => DeliveryBoyOrderActionsDto)
  actions!: DeliveryBoyOrderActionsDto;
}
