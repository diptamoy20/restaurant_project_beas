import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class DeliveryBoyOrderHistorySummaryDto {
  @ApiProperty({ example: 12 })
  @IsNumber()
  totalOrders!: number;

  @ApiProperty({ example: 15420 })
  @IsNumber()
  totalDeliveredAmount!: number;
}

export class DeliveryBoyOrderHistoryItemDto {
  @ApiProperty({ example: 4 })
  @IsNumber()
  deliveryId!: number;

  @ApiProperty({ example: 23 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'ORD-1779272733608' })
  @IsString()
  orderNumber!: string;

  @ApiPropertyOptional({ example: 'Diptamoy', nullable: true })
  @IsOptional()
  @IsString()
  customerName!: string | null;

  @ApiProperty({ example: 'Burger House' })
  @IsString()
  restaurantName!: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  itemCount!: number;

  @ApiProperty({ example: 6 })
  @IsNumber()
  totalQuantity!: number;

  @ApiProperty({ example: 1414 })
  @IsNumber()
  finalAmount!: number;

  @ApiPropertyOptional({ example: 'RAZORPAY', nullable: true })
  @IsOptional()
  @IsString()
  paymentMethod!: string | null;

  @ApiProperty({ example: 'PAID' })
  @IsString()
  paymentStatus!: string;

  @ApiPropertyOptional({
    example:
      'EN Block, Sector V, Bidhannagar, Kolkata Metropolitan Area, Bidhannagar, North 24 Parganas, West Bengal, 700091, India, Bidhannagar, West Bengal',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  addressText!: string | null;

  @ApiPropertyOptional({ example: '2026-06-03T12:15:00.000Z', nullable: true })
  @IsOptional()
  @IsDate()
  deliveredAt!: Date | null;

  @ApiPropertyOptional({ example: '12:15 PM', nullable: true })
  @IsOptional()
  @IsString()
  deliveredTime!: string | null;
}

export class DeliveryBoyOrderHistoryResponseDto {
  @ApiProperty({ example: '2026-06-03' })
  @IsString()
  selectedDate!: string;

  @ApiProperty({ type: () => DeliveryBoyOrderHistorySummaryDto })
  @ValidateNested()
  @Type(() => DeliveryBoyOrderHistorySummaryDto)
  summary!: DeliveryBoyOrderHistorySummaryDto;

  @ApiProperty({ type: () => DeliveryBoyOrderHistoryItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeliveryBoyOrderHistoryItemDto)
  items!: DeliveryBoyOrderHistoryItemDto[];

  @ApiProperty({ example: 1 })
  @IsNumber()
  page!: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  pageSize!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  totalPages!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  total!: number;
}
