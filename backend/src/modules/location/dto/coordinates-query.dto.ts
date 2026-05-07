import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CoordinatesQueryDto {
  @ApiPropertyOptional({ example: 22.5726, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 88.3639, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ example: 22.5726, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 88.3639, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  getCoordinates(): { lat: number; lng: number } {
    const lat = this.lat ?? this.latitude;
    const lng = this.lng ?? this.longitude;

    if (lat === undefined || lng === undefined) {
      throw new BadRequestException('lat/lng coordinates are required');
    }

    return { lat, lng };
  }
}
