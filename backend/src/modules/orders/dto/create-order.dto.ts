import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, ValidateNested } from 'class-validator';

class OrderItemInputDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 189 })
  @Type(() => Number)
  @IsNumber()
  price!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsNumber()
  userId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  tableId?: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  addressId?: number;

  @ApiProperty({ enum: ['DINE_IN', 'DELIVERY', 'TAKEAWAY'], example: 'DELIVERY' })
  @IsIn(['DINE_IN', 'DELIVERY', 'TAKEAWAY'])
  orderType!: string;

  @ApiPropertyOptional({ example: 20 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiProperty({ type: () => OrderItemInputDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}
