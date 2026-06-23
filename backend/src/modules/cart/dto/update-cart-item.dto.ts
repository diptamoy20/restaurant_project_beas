import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

import { CartAddonDto } from './cart-addon.dto';

export class UpdateCartItemDto {
  @ApiPropertyOptional({
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  restaurantId?: number;

  @ApiPropertyOptional({
    example: 2,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({
    type: [CartAddonDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({
    each: true,
  })
  @Type(() => CartAddonDto)
  addOns?: CartAddonDto[];

  @ApiPropertyOptional({
    example: 189,
    description: 'Accepted for backward compatibility. Server menu pricing is authoritative.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  price?: number;
}
