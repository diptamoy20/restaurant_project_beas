import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PosOrderItemResponseDto {
  @ApiProperty({ example: 18 })
  menuItemId!: number;

  @ApiProperty({ example: 'Cheese Burst Pizza' })
  name!: string;

  @ApiProperty({ example: 399 })
  price!: number;

  @ApiPropertyOptional({
    example:
      'https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=800&q=80',
  })
  image?: string | null;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 399 })
  total!: number;
}

export class PosOrderResponseDto {
  @ApiProperty({ example: 'ORD-0957443' })
  id!: string;

  @ApiProperty({ example: 'ORD-0957443' })
  orderNumber!: string;

  @ApiProperty({ example: '9876543210' })
  customerPhone!: string;

  @ApiProperty({ type: () => PosOrderItemResponseDto, isArray: true })
  items!: PosOrderItemResponseDto[];

  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiProperty({ example: 'paid' })
  paymentStatus!: string;

  @ApiProperty({ example: 399 })
  subtotal!: number;

  @ApiProperty({ example: 0 })
  discount!: number;

  @ApiProperty({ example: 0.05 })
  taxRate!: number;

  @ApiProperty({ example: 19.95 })
  taxAmount!: number;

  @ApiProperty({ example: 418.95 })
  grandTotal!: number;

  @ApiProperty({ example: '2026-07-14T12:09:17.443Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-07-14T12:09:17.443Z' })
  completedAt?: Date | null;
}
