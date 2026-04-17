import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateDeliveryLocationDto {
  @Type(() => Number)
  @IsNumber()
  deliveryId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  speed?: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  heading?: number;
}
