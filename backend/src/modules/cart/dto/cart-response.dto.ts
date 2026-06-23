import { ApiProperty } from '@nestjs/swagger';

class CartSummaryItemDto {
  @ApiProperty()
  cartItemId!: number;

  @ApiProperty()
  menuItemId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty({
    nullable: true,
  })
  discount!: number | null;

  @ApiProperty({
    type: [Object],
  })
  addOns!: unknown[];

  @ApiProperty({
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({
    nullable: true,
  })
  image!: string | null;

  @ApiProperty({
    nullable: true,
  })
  ingredients!: string | null;

  // @ApiProperty()
  // rating!: number;

  @ApiProperty({
    nullable: true,
  })
  rating!: number | null;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty({
    nullable: true,
  })
  restaurantId!: number | null;

  @ApiProperty()
  bestSeller!: boolean;
}

export class CartResponseDto {
  @ApiProperty()
  userId!: number;

  @ApiProperty()
  totalItems!: number;

  @ApiProperty()
  subtotal!: number;

  @ApiProperty({
    type: [CartSummaryItemDto],
  })
  cartItems!: CartSummaryItemDto[];
}
