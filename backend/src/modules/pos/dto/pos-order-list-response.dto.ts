import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PosOrderListItemDto {
  @ApiProperty({ example: 1 })
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

class PosOrderListOrderDto {
  @ApiProperty({ example: 'ORD-3012273' })
  id!: string;

  @ApiProperty({ example: 'ORD-3012273' })
  orderNumber!: string;

  @ApiProperty({ example: '9876543210', nullable: true })
  customerPhone!: string | null;

  @ApiProperty({ type: () => PosOrderListItemDto, isArray: true })
  items!: PosOrderListItemDto[];

  @ApiProperty({ example: 'cash' })
  paymentMethod!: string;

  @ApiProperty({ example: 'paid' })
  paymentStatus!: string;

  @ApiProperty({ example: 'completed' })
  orderStatus!: string;

  @ApiProperty({ example: 'takeaway' })
  orderType!: string;

  @ApiProperty({ example: 618 })
  subtotal!: number;

  @ApiProperty({ example: 0 })
  discount!: number;

  @ApiProperty({ example: 0.05 })
  taxRate!: number;

  @ApiProperty({ example: 30.9 })
  taxAmount!: number;

  @ApiProperty({ example: 648.9 })
  grandTotal!: number;

  @ApiProperty({ example: '2026-07-16T12:00:00.000Z' })
  createdAt!: Date;

  @ApiPropertyOptional({ example: '2026-07-16T12:30:00.000Z', nullable: true })
  completedAt?: Date | null;
}

class PosOrderListPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 150 })
  totalRecords!: number;

  @ApiProperty({ example: 8 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

export class PosOrderListResponseDto {
  @ApiProperty({ type: () => PosOrderListOrderDto, isArray: true })
  orders!: PosOrderListOrderDto[];

  @ApiProperty({ type: () => PosOrderListPaginationDto })
  pagination!: PosOrderListPaginationDto;
}
