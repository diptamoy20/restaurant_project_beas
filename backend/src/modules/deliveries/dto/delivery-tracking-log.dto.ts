import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDate, IsNumber, IsOptional } from 'class-validator';

export class DeliveryTrackingLogDto {
  @ApiProperty({ example: 2 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  deliveryId!: number;

  @ApiProperty({ example: 12.971 })
  @IsNumber()
  latitude!: number;

  @ApiProperty({ example: 77.599 })
  @IsNumber()
  longitude!: number;

  @ApiPropertyOptional({ example: 22, nullable: true })
  @IsOptional()
  @IsNumber()
  speed?: number | null;

  @ApiPropertyOptional({ example: 135, nullable: true })
  @IsOptional()
  @IsNumber()
  heading?: number | null;

  @ApiProperty({ example: '2026-04-17T09:45:00.000Z' })
  @IsDate()
  recordedAt!: Date;
}
