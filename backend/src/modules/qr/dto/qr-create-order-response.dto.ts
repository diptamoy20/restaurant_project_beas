import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class QRCreateOrderResponseDto {
  @ApiProperty({ example: 123, description: 'Order ID' })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'ORD-1001', description: 'Short sequential order number' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'PENDING', description: 'Initial order status' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 20, description: 'Estimated preparation time in minutes' })
  @IsNumber()
  estimatedTime!: number;

  @ApiProperty({ example: 500, description: 'Final amount calculated by the server' })
  @IsNumber()
  finalAmount!: number;

  @ApiProperty({ example: 450, description: 'Discounted item subtotal before coupon and GST' })
  @IsNumber()
  subtotalAmount!: number;

  @ApiProperty({ example: 450, description: 'Taxable amount after discounts' })
  @IsNumber()
  taxableAmount!: number;

  @ApiProperty({ example: 5, description: 'GST rate applied' })
  @IsNumber()
  gstRate!: number;

  @ApiProperty({ example: 11.25, description: 'CGST amount' })
  @IsNumber()
  cgstAmount!: number;

  @ApiProperty({ example: 11.25, description: 'SGST amount' })
  @IsNumber()
  sgstAmount!: number;

  @ApiProperty({ example: 22.5, description: 'Total GST amount' })
  @IsNumber()
  taxAmount!: number;
}
