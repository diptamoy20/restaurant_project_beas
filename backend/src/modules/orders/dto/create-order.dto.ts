import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';

class OrderItemInputDto {
  @Type(() => Number)
  @IsNumber()
  menuItemId!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  variantId?: number;

  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  price!: number;
}

export class CreateOrderDto {
  @Type(() => Number)
  @IsNumber()
  userId!: number;

  @Type(() => Number)
  @IsNumber()
  restaurantId!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  tableId?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  addressId?: number;

  @IsIn(['DINE_IN', 'DELIVERY', 'TAKEAWAY'])
  orderType!: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];
}

