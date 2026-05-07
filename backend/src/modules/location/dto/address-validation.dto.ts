import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class AddressValidationDto {
  @ApiProperty({ example: 22.5726, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 88.3639, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  restaurantId?: number;
}
