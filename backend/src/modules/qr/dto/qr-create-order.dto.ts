import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QRCreateOrderItemDto {
  @ApiProperty({ example: 1, description: 'Menu item ID' })
  @IsNumber()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 2, description: 'Variant ID if selected' })
  @IsOptional()
  @IsNumber()
  variantId?: number;

  @ApiProperty({ example: 2, description: 'Quantity of the item' })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class QRCreateOrderDto {
  @ApiProperty({ example: 1, description: 'Restaurant ID' })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 12, description: 'Table ID' })
  @IsNumber()
  tableId!: number;

  @ApiProperty({ type: () => QRCreateOrderItemDto, isArray: true, description: 'Order items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRCreateOrderItemDto)
  items!: QRCreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'COD', description: 'Payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 50, description: 'Discount amount' })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;
}