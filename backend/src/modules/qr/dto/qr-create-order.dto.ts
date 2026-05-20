import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

export class QRCreateOrderAddonDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Add-on group ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addonGroupId!: number;

  @ApiProperty({
    example: 2,
    minimum: 1,
    description: 'Add-on option ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addonOptionId!: number;
}

export class QRCreateOrderItemDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Menu item ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  menuItemId!: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'Variant ID',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;

  @ApiProperty({ example: 2, minimum: 1, description: 'Quantity of the item' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: [{ addonGroupId: 1, addonOptionId: 2 }],
    description: 'Selected add-on options for this menu item',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRCreateOrderAddonDto)
  addons?: QRCreateOrderAddonDto[];
}

export class QRCreateOrderDto {
  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Restaurant ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId!: number;

  @ApiProperty({
    example: 1,
    minimum: 1,
    description: 'Table ID',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  tableId!: number;

  @ApiProperty({
    type: () => QRCreateOrderItemDto,
    isArray: true,
    minItems: 1,
    description: 'Order items',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QRCreateOrderItemDto)
  items!: QRCreateOrderItemDto[];

  @ApiPropertyOptional({
    enum: ['COD', 'RAZORPAY'],
    example: 'COD',
    description: 'Payment method',
  })
  @IsOptional()
  @IsIn(['COD', 'RAZORPAY'])
  paymentMethod?: string;
}
