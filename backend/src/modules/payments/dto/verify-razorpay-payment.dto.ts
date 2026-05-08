import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @ApiProperty({ example: 101 })
  @Type(() => Number)
  @IsInt()
  orderId!: number;

  @ApiProperty({ example: 'order_Q1W2E3R4T5Y6' })
  @IsString()
  razorpayOrderId!: string;

  @ApiProperty({ example: 'pay_A1B2C3D4E5F6' })
  @IsString()
  razorpayPaymentId!: string;

  @ApiProperty({ example: 'generated_signature' })
  @IsString()
  razorpaySignature!: string;
}
