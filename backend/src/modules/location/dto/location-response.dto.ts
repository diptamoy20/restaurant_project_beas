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
