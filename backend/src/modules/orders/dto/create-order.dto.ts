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
  addressId?: number;

  @ApiPropertyOptional({ enum: OrderSource, example: OrderSource.WEBSITE })
  @IsOptional()
  @IsIn(Object.values(OrderSource))
  source?: OrderSource;

  @ApiProperty({ enum: ['DINE_IN', 'DELIVERY', 'TAKEAWAY'], example: 'DELIVERY' })
  @IsIn(['DINE_IN', 'DELIVERY', 'TAKEAWAY'])
  orderType!: string;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ type: () => OrderItemInputDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
