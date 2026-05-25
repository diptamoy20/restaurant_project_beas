import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class DeliveryQuoteDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  deliveryAvailable!: boolean;

  @ApiProperty({ example: 2.4 })
  @IsNumber()
  distanceKm!: number;

  @ApiProperty({ example: 32 })
  @IsNumber()
  estimatedDeliveryTimeMinutes!: number;

  @ApiProperty({ example: 38 })
  @IsNumber()
  deliveryFee!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  packagingCharge?: number;

  @ApiPropertyOptional({ example: 499, nullable: true })
  @IsOptional()
  @IsNumber()
  freeDeliveryMinAmount?: number | null;

  @ApiPropertyOptional({ example: 'Outside delivery range', nullable: true })
  @IsOptional()
  @IsString()
  deliveryUnavailableReason?: string | null;

  @ApiPropertyOptional({
    example: {
      distanceKm: 1.13,
      baseFee: 20,
      baseDistanceKm: 1,
      extraDistanceKm: 0.13,
      extraUnits: 1,
      perKmFee: 7,
      deliveryCharge: 27,
      packagingCharge: 10,
      freeDeliveryApplied: false,
      freeDeliveryMinAmount: 499,
    },
  })
  @IsOptional()
  deliveryFeeBreakdown?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 199 })
  @IsOptional()
  @IsNumber()
  minimumOrderAmount?: number;

  @ApiPropertyOptional({ example: 'Inside delivery zone' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AddressValidationResponseDto extends DeliveryQuoteDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  deliverable!: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  restaurantId?: number;
}
