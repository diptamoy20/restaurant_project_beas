import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
  IsInt,
} from 'class-validator';

const PHONE_VALIDATION_MESSAGE =
  'Enter a valid phone number using digits only, with optional country code. Example: +919900000005 or 9900000005';

class PosOrderItemAddonDto {
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

class PosOrderItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  menuItemId!: number;

  @ApiPropertyOptional({ example: 2 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  variantId?: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: [{ addonGroupId: 1, addonOptionId: 2 }],
    description: 'Selected add-on options for this item',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemAddonDto)
  addons?: PosOrderItemAddonDto[];
}

export class PosCreateOrderDto {
  @ApiProperty({
    example: '9876543210',
    description:
      'Walk-in customer phone number. Used to link order to an existing customer or create a new one.',
  })
  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: PHONE_VALIDATION_MESSAGE })
  customerPhone!: string;

  @ApiPropertyOptional({
    enum: ['DINE_IN', 'TAKEAWAY'],
    example: 'TAKEAWAY',
    description: 'Order type. Defaults to TAKEAWAY.',
  })
  @IsOptional()
  @IsIn(['DINE_IN', 'TAKEAWAY'])
  orderType?: string;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  tableId?: number;

  @ApiPropertyOptional({
    enum: ['CASH', 'CARD', 'UPI', 'WALLET'],
    example: 'CASH',
    description: 'Payment method. For POS, payment is immediate.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['CASH', 'CARD', 'UPI', 'WALLET'])
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'WELCOME50' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  couponCode?: string;

  @ApiProperty({ type: () => PosOrderItemDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PosOrderItemDto)
  items!: PosOrderItemDto[];
}
