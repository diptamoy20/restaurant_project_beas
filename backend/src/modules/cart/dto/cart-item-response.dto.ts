import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MenuItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;
}

class MenuItemVariantDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;
}

export class CartItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  userId!: number;

  @ApiProperty()
  menuItemId!: number;

  @ApiPropertyOptional()
  variantId?: number;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  menuItem?: MenuItemDto;

  @ApiPropertyOptional()
  variant?: MenuItemVariantDto;
}
