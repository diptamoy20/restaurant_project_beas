import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateMyDeliveryLocationDto {
  @ApiProperty({ example: 1 })
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  orderId!: number;

  @ApiProperty({ example: 22.5726 })
  @IsDefined()
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: 88.3639 })
  @IsDefined()
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ example: 22, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speed?: number;

  @ApiPropertyOptional({ example: 135, minimum: 0, maximum: 360 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;
}
