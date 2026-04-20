import { Type } from 'class-transformer';
import {
  IsDefined,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class UpdateDeliveryLocationDto {
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  deliveryId!: number;

  @IsDefined()
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @IsDefined()
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  speed?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(360)
  heading?: number;
}
