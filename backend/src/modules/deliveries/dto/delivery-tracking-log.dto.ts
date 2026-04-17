import { IsDate, IsNumber, IsOptional } from 'class-validator';

export class DeliveryTrackingLogDto {
  @IsNumber()
  id!: number;

  @IsNumber()
  deliveryId!: number;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  @IsOptional()
  @IsNumber()
  speed?: number | null;

  @IsOptional()
  @IsNumber()
  heading?: number | null;

  @IsDate()
  recordedAt!: Date;
}
