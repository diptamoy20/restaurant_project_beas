import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class OrderMenuItemSummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Paneer Burger' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 189 })
  @IsNumber()
  price!: number;
}

export class OrderVariantSummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Regular' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 189 })
  @IsNumber()
  price!: number;
}

export class OrderItemResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  variantId!: number | null;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 189 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: 378 })
  @IsNumber()
  totalPrice!: number;

  @ApiPropertyOptional({ type: () => OrderMenuItemSummaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderMenuItemSummaryDto)
  menuItem?: OrderMenuItemSummaryDto;

  @ApiPropertyOptional({ type: () => OrderVariantSummaryDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderVariantSummaryDto)
  variant?: OrderVariantSummaryDto | null;
}

export class OrderStatusLogResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'PLACED' })
  @IsString()
  status!: string;

  @ApiProperty({ example: '2026-04-20T00:00:00.000Z' })
  @IsDate()
  changedAt!: Date;
}

export class OrderPaymentResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  userId!: number;

  @ApiPropertyOptional({ example: 'TXN-20260417-001', nullable: true })
  @IsOptional()
  @IsString()
  transactionId!: string | null;

  @ApiProperty({ example: 268 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'SUCCESS' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'UPI' })
  @IsString()
  method!: string;
}

export class OrderRestaurantSummaryDto {
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
}

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  userId!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  tableId!: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  addressId!: number | null;

  @ApiProperty({ example: 'ORD-1713570000000' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'PLACED' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'DELIVERY' })
  @IsString()
  orderType!: string;

  @ApiProperty({ example: 378 })
  @IsNumber()
  totalAmount!: number;

  @ApiPropertyOptional({ example: 20, nullable: true })
  @IsOptional()
  @IsNumber()
  discountAmount!: number | null;

  @ApiProperty({ example: 358 })
  @IsNumber()
  finalAmount!: number;

  @ApiProperty({ example: 'PENDING' })
  @IsString()
  paymentStatus!: string;

  @ApiProperty({ example: '2026-04-20T00:00:00.000Z' })
  @IsDate()
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-20T00:10:00.000Z' })
  @IsDate()
  updatedAt!: Date;

  @ApiProperty({ type: () => OrderItemResponseDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemResponseDto)
  items!: OrderItemResponseDto[];

  @ApiProperty({ type: () => OrderStatusLogResponseDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderStatusLogResponseDto)
  statusLogs!: OrderStatusLogResponseDto[];

  @ApiPropertyOptional({ type: () => OrderPaymentResponseDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentResponseDto)
  payments?: OrderPaymentResponseDto[];

  @ApiPropertyOptional({ type: () => OrderRestaurantSummaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderRestaurantSummaryDto)
  restaurant?: OrderRestaurantSummaryDto;
}
