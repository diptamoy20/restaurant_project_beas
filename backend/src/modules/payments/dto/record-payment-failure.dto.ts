import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class RecordPaymentFailureDto {
  @ApiProperty({ example: 101 })
  @Type(() => Number)
  @IsInt()
  orderId!: number;

  @ApiProperty({ example: 'order_Q1W2E3R4T5Y6' })
  @IsString()
  razorpayOrderId!: string;

  @ApiProperty({ example: 'Checkout popup closed by customer', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
