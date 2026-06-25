import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  menuItemId!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  imageUrl!: string | null;

  @ApiProperty({
    nullable: true,
  })
  variantName!: string | null;

  @ApiProperty({
    type: [String],
  })
  addons!: string[];

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  unitPrice!: number;

  @ApiProperty()
  totalPrice!: number;
}
