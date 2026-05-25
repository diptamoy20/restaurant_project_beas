import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

import { PaginationMetaDto } from '../../../common/dto/pagination.dto';

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

export class OrderItemAddonResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiPropertyOptional({ example: 1, nullable: true })
  @IsOptional()
  @IsNumber()
  addonGroupId!: number | null;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  addonOptionId!: number | null;

  @ApiProperty({ example: 'Extra Toppings' })
  @IsString()
  addonGroupName!: string;

  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  addonOptionName!: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  addonOptionPrice!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  quantity!: number;
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

  @ApiPropertyOptional({ type: () => OrderItemAddonResponseDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemAddonResponseDto)
  addons?: OrderItemAddonResponseDto[];
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
  @IsOptional()
  userId?: number | null;

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

export class OrderCustomerSummaryDto {
  @ApiProperty({ example: 3 })
  @IsNumber()
  id!: number;

  @ApiPropertyOptional({ example: 'Surojit Bera', nullable: true })
  @IsOptional()
  @IsString()
  name!: string | null;

  @ApiPropertyOptional({ example: 'surojit@example.com', nullable: true })
  @IsOptional()
  @IsString()
  email!: string | null;

  @ApiPropertyOptional({ example: '9876543210', nullable: true })
  @IsOptional()
  @IsString()
  phone!: string | null;
}

export class OrderAddressSummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Home' })
  @IsString()
  label!: string;

  @ApiProperty({ example: '45 Residency Road' })
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
}

export class OrderTableSummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'T1' })
  @IsString()
  tableNumber!: string;
}

export class OrderDeliverySummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'ON_THE_WAY' })
  @IsString()
  status!: string;
}

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @IsOptional()
  userId?: number | null;

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

  @ApiProperty({ example: 'ORD-1001' })
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

  @ApiProperty({ example: 450 })
  @IsNumber()
  subtotalAmount!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  menuDiscountAmount!: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  couponDiscountAmount!: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  manualDiscountAmount!: number;

  @ApiProperty({ example: 410 })
  @IsNumber()
  taxableAmount!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  gstRate!: number;

  @ApiProperty({ example: 10.25 })
  @IsNumber()
  cgstAmount!: number;

  @ApiProperty({ example: 10.25 })
  @IsNumber()
  sgstAmount!: number;

  @ApiProperty({ example: 0 })
  @IsNumber()
  igstAmount!: number;

  @ApiProperty({ example: 20.5 })
  @IsNumber()
  taxAmount!: number;

  @ApiProperty({ example: 'PENDING' })
  @IsString()
  paymentStatus!: string;

  @ApiPropertyOptional({ example: 'RAZORPAY', nullable: true })
  @IsOptional()
  @IsString()
  paymentMethod!: string | null;

  @ApiPropertyOptional({ example: 'order_Q1W2E3R4T5Y6', nullable: true })
  @IsOptional()
  @IsString()
  razorpayOrderId!: string | null;

  @ApiPropertyOptional({ example: 'pay_A1B2C3D4E5F6', nullable: true })
  @IsOptional()
  @IsString()
  razorpayPaymentId!: string | null;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  paymentRetryCount!: number;

  @ApiProperty({ example: '2026-04-20T00:00:00.000Z' })
  @IsDate()
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-04-20T00:00:00.000Z', nullable: true })
  @IsOptional()
  acceptedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-04-20T00:00:00.000Z', nullable: true })
  @IsOptional()
  preparedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-04-20T00:00:00.000Z', nullable: true })
  @IsOptional()
  deliveredAt!: Date | null;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  estimatedDeliveryMinutes?: number;

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

  @ApiPropertyOptional({ type: () => OrderCustomerSummaryDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCustomerSummaryDto)
  customer?: OrderCustomerSummaryDto;

  @ApiPropertyOptional({ type: () => OrderAddressSummaryDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderAddressSummaryDto)
  address?: OrderAddressSummaryDto | null;

  @ApiPropertyOptional({ type: () => OrderTableSummaryDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderTableSummaryDto)
  table?: OrderTableSummaryDto | null;

  @ApiPropertyOptional({ type: () => OrderDeliverySummaryDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderDeliverySummaryDto)
  delivery?: OrderDeliverySummaryDto | null;
}

export class PaginatedOrderResponseDto extends PaginationMetaDto {
  @ApiProperty({ type: () => OrderResponseDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderResponseDto)
  items!: OrderResponseDto[];
}
