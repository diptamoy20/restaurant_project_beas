import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderSource } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

class OrderItemAddonInputDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addonGroupId!: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addonOptionId!: number;
}

class OrderItemInputDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: 189,
    description: 'Accepted for backward compatibility. Server menu pricing is authoritative.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({
    example: [{ addonGroupId: 1, addonOptionId: 2 }],
    description: 'Selected add-on options for this item',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemAddonInputDto)
  addons?: OrderItemAddonInputDto[];
}

export class CreateOrderDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsInt()
  userId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  tableId?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  sessionId?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  addressId?: number;

  @ApiPropertyOptional({ enum: OrderSource, example: OrderSource.WEBSITE })
  @IsOptional()
  @IsIn(Object.values(OrderSource))
  source?: OrderSource;

  @ApiProperty({ enum: ['DINE_IN', 'DELIVERY', 'TAKEAWAY'], example: 'DELIVERY' })
  @IsIn(['DINE_IN', 'DELIVERY', 'TAKEAWAY'])
  orderType!: string;

  @ApiPropertyOptional({
    example: 20,
    deprecated: true,
    description:
      'Deprecated. Customers cannot control discounts; use couponCode. Admin may use manualDiscountAmount.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 20, description: 'Admin/manager manual discount only' })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  manualDiscountAmount?: number;

  @ApiPropertyOptional({ example: 'WELCOME50' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  couponCode?: string;

  @ApiPropertyOptional({ enum: ['RAZORPAY', 'COD'], example: 'RAZORPAY' })
  @IsOptional()
  @IsString()
  @IsIn(['RAZORPAY', 'COD'])
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 30 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  tipAmount?: number;

  @ApiProperty({ type: () => OrderItemInputDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
