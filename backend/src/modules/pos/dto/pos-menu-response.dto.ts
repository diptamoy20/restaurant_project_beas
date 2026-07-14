import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PosMenuRestaurantDto {
  @ApiProperty({ example: 'Beas Cafe', description: 'Restaurant name' })
  restaurant_name!: string;

  @ApiProperty({ example: '45 Residency Road, Kolkata', description: 'Restaurant address' })
  restaurant_address!: string;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5', description: 'GST identification number' })
  gst_no?: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/image/upload/logo.png',
    description: 'Restaurant logo image URL',
  })
  restaurant_logo?: string | null;
}

export class PosMenuItemDto {
  @ApiProperty({ example: 1, description: 'Menu item ID' })
  id!: number;

  @ApiProperty({ example: 'Classic Zinger Burger', description: 'Menu item name' })
  name!: string;

  @ApiPropertyOptional({
    example: 'Crispy fillet, lettuce, mayo and toasted bun.',
    description: 'Menu item description',
  })
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://res.cloudinary.com/example/image/upload/v1/menu-items/zinger.jpg',
    description: 'Menu item image URL',
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 4.7, description: 'Item rating' })
  rating?: number | null;

  @ApiProperty({
    example: 189,
    description: 'Effective price (discountPrice if available, otherwise price)',
  })
  price!: number;

  @ApiProperty({
    example: false,
    description: 'Whether the item is vegetarian (derived from foodType)',
  })
  isVeg!: boolean;

  @ApiProperty({ example: true, description: 'Whether the item is currently available' })
  isAvailable!: boolean;
}

export class PosMenuResponseDto {
  @ApiProperty({ type: () => PosMenuRestaurantDto })
  restaurant!: PosMenuRestaurantDto;

  @ApiProperty({ type: () => PosMenuItemDto, isArray: true })
  items!: PosMenuItemDto[];
}
