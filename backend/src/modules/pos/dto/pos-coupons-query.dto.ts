import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class PosCouponsQueryDto {
  @ApiPropertyOptional({
    example: 450,
    description: 'Current cart subtotal for estimating discount amounts.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotalAmount?: number;
}
