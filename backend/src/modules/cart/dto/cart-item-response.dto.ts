import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MenuItemDto {
  @ApiProperty()
  id!: number;

  @ApiPropertyOptional()
  restaurantId!: number | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional()
  category?: {
    id: number;
    name: string;
  };
}

class MenuItemVariantDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;
}

class CartAddonResponseDto {
  @ApiProperty()
  addonOptionId!: number;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  totalPrice!: number;
}

export class CartItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  userId!: number;

  @ApiPropertyOptional()
  restaurantId!: number | null;

  @ApiProperty()
  menuItemId!: number;

  @ApiPropertyOptional()
  variantId!: number | null;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional({
    type: [CartAddonResponseDto],
  })
  addOns?: CartAddonResponseDto[] | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty()
  menuItem?: MenuItemDto;

  @ApiPropertyOptional()
  variant!: MenuItemVariantDto | null;
}
