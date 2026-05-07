import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class RazorpayOrderResponseDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'order_Q1W2E3R4T5Y6' })
  @IsString()
  razorpayOrderId!: string;

  @ApiProperty({ example: 49900, description: 'Amount in paise' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'INR' })
  @IsString()
  currency!: string;

  @ApiProperty({ example: 'created' })
  @IsString()
  status!: string;
}

export class VerifyPaymentResponseDto {
  @ApiProperty({ example: 101 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'PAID' })
  @IsString()
  paymentStatus!: string;

  @ApiProperty({ example: 'RAZORPAY' })
  @IsString()
  paymentMethod!: string;

  @ApiProperty({ example: 'Payment verified successfully' })
  @IsString()
  message!: string;
}
