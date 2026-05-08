import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MenuItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  restaurantId!: number;

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

export class CartItemResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  userId!: number;

  @ApiProperty()
  menuItemId!: number;

  @ApiPropertyOptional()
  variantId!: number | null;

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
  variant!: MenuItemVariantDto | null;
}
