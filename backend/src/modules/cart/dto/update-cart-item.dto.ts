import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

class CartAddonDto {
  @ApiProperty({
    example: 5,
  })
  @Type(() => Number)
  @IsInt()
  addonOptionId!: number;

  @ApiProperty({
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class UpdateCartItemDto {
  @ApiPropertyOptional({
    example: 1,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  restaurantId?: number;

  @ApiProperty({
    example: 2,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

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
