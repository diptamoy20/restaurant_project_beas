import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateCartItemDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  menuItemId!: number;

  @ApiPropertyOptional({ example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  variantId?: number;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({
    example: 189,
    description: 'Accepted for backward compatibility. Server menu pricing is authoritative.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  price?: number;
}
