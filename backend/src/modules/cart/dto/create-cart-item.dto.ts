import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional } from 'class-validator';

export class CreateCartItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 189 })
  @Type(() => Number)
  @IsNumber()
  price!: number;
}
