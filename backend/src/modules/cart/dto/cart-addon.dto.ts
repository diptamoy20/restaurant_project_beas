import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CartAddonDto {
  @ApiPropertyOptional({ example: 2, description: 'Preserved for checkout quote validation' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  addonGroupId?: number;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  addonOptionId!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export type StoredCartAddon = {
  addonGroupId: number;
  addonOptionId: number;
  quantity: number;
};
