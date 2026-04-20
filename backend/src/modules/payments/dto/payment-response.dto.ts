import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  userId!: number;

  @ApiPropertyOptional({ example: 'TXN-20260417-001', nullable: true })
  @IsOptional()
  @IsString()
  transactionId!: string | null;

  @ApiProperty({ example: 268 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'SUCCESS' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'UPI' })
  @IsString()
  method!: string;
}
