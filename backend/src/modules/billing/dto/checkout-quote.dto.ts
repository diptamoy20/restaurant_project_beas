import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CheckoutQuoteAddonDto {
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

export class CheckoutQuoteItemDto {
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

  @ApiPropertyOptional({ type: () => CheckoutQuoteAddonDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutQuoteAddonDto)
  addons?: CheckoutQuoteAddonDto[];
}

export class CheckoutQuoteRequestDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  addressId?: number;

  @ApiPropertyOptional({ example: 'DELIVERY' })
  @IsOptional()
  @IsString()
  orderType?: string;

  @ApiPropertyOptional({ example: 'WELCOME50' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  couponCode?: string;

  @ApiProperty({ type: () => CheckoutQuoteItemDto, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutQuoteItemDto)
  items!: CheckoutQuoteItemDto[];
}

export class AvailableCouponsQueryDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId!: number;

  @ApiPropertyOptional({ example: 450 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotalAmount?: number;
}

export class AvailableCouponResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'WELCOME50' })
  code!: string;

  @ApiPropertyOptional({ example: 'Welcome offer', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'PERCENTAGE' })
  discountType!: string;

  @ApiProperty({ example: 10 })
  discountValue!: number;

  @ApiPropertyOptional({ example: 100, nullable: true })
  maxDiscountAmount!: number | null;

  @ApiPropertyOptional({ example: 299, nullable: true })
  minOrderAmount!: number | null;

  @ApiProperty({ example: true })
  eligible!: boolean;

  @ApiPropertyOptional({ example: 'Add Rs. 99 more to apply', nullable: true })
  reason!: string | null;

  @ApiProperty({ example: 40 })
  estimatedDiscount!: number;
}

export class CheckoutQuoteLineItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  variantId!: number | null;

  @ApiProperty({ example: 'Paneer Burger' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 229 })
  @IsNumber()
  mrpUnitPrice!: number;

  @ApiProperty({ example: 199 })
  @IsNumber()
  unitPrice!: number;

  @ApiProperty({ example: 60 })
  @IsNumber()
  menuDiscountAmount!: number;

  @ApiProperty({ example: 398 })
  @IsNumber()
  totalPrice!: number;
}

export class CheckoutQuoteResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  currency!: string;

  @ApiProperty({ type: () => CheckoutQuoteLineItemDto, isArray: true })
  items!: CheckoutQuoteLineItemDto[];

  @ApiProperty({ example: 500 })
  @IsNumber()
  mrpSubtotal!: number;

  @ApiProperty({ example: 450 })
  @IsNumber()
  subtotalAmount!: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  menuDiscountAmount!: number;

  @ApiPropertyOptional({ example: 'WELCOME50', nullable: true })
  @IsOptional()
  @IsString()
  couponCode!: string | null;

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

  @ApiProperty({ example: 430.5 })
  @IsNumber()
  finalAmount!: number;
}
