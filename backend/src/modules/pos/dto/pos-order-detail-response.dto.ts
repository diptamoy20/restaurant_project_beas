import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PosOrderDetailItemDto {
  @ApiProperty({ example: 28 })
  menuItemId!: number;

  @ApiProperty({ example: 'Brownie' })
  name!: string;

  @ApiProperty({ example: 159 })
  price!: number;

  @ApiPropertyOptional({
    example:
      'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
  })
  image?: string | null;

  @ApiProperty({ example: 4 })
  quantity!: number;

  @ApiProperty({ example: 636 })
  total!: number;
}

class PosOrderDetailCustomerDto {
  @ApiProperty({ example: 'Test', nullable: true })
  name!: string | null;

  @ApiProperty({ example: '996693969', nullable: true })
  mobile!: string | null;
}

export class PosOrderDetailResponseDto {
  @ApiProperty({ example: 'ORD-0344029' })
  id!: string;

  @ApiProperty({ example: 'ORD-0344029' })
  orderNumber!: string;

  @ApiProperty({ type: () => PosOrderDetailItemDto, isArray: true })
  items!: PosOrderDetailItemDto[];

  @ApiProperty({ type: () => PosOrderDetailCustomerDto })
  customer!: PosOrderDetailCustomerDto;

  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiProperty({ example: 'paid' })
  paymentStatus!: string;

  @ApiProperty({ example: 636 })
  subtotal!: number;

  @ApiProperty({ example: 31.8 })
  discount!: number;

  @ApiProperty({ example: 0.03 })
  taxRate!: number;

  @ApiProperty({ example: 18.126 })
  taxAmount!: number;

  @ApiProperty({ example: 622.326 })
  grandTotal!: number;

  @ApiProperty({ example: '2026-07-20T06:52:24.029Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-07-20T06:52:24.029Z', nullable: true })
  completedAt?: Date | null;
}
