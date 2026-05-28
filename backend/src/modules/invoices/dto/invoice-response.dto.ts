import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceLineItemDto {
  @ApiProperty({ example: 'Paneer Burger' })
  name!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 189 })
  unitPrice!: number;

  @ApiProperty({ example: 378 })
  totalPrice!: number;
}

export class InvoiceResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 101 })
  orderId!: number;

  @ApiProperty({ example: 'INV-20260527-000101' })
  invoiceNumber!: string;

  @ApiProperty({ example: 'AVAILABLE' })
  status!: string;

  @ApiProperty({ example: true })
  canDownload!: boolean;

  @ApiPropertyOptional({ example: 'Payment is pending for this COD order', nullable: true })
  unavailableReason!: string | null;

  @ApiPropertyOptional({ example: '2026-05-27T12:00:00.000Z', nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ example: 'ORD-1001' })
  orderNumber!: string;

  @ApiProperty({ example: '2026-05-27T12:00:00.000Z' })
  orderDate!: Date;

  @ApiProperty({ example: 'PAID' })
  paymentStatus!: string;

  @ApiPropertyOptional({ example: 'RAZORPAY', nullable: true })
  paymentMethod!: string | null;

  @ApiProperty({ example: 'DELIVERED' })
  orderStatus!: string;

  @ApiProperty({ example: 450 })
  subtotalAmount!: number;

  @ApiProperty({ example: 40 })
  discountAmount!: number;

  @ApiProperty({ example: 20.5 })
  taxAmount!: number;

  @ApiProperty({ example: 27 })
  deliveryCharge!: number;

  @ApiProperty({ example: 10 })
  packagingCharge!: number;

  @ApiProperty({ example: 30 })
  tipAmount!: number;

  @ApiProperty({ example: 497.5 })
  finalAmount!: number;

  @ApiProperty({ type: () => InvoiceLineItemDto, isArray: true })
  items!: InvoiceLineItemDto[];
}
