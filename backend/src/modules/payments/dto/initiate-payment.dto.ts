import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsNumber()
  userId!: number;

  @ApiPropertyOptional({ example: 'TXN-20260417-001' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiProperty({ example: 268 })
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'SUCCESS' })
  @IsString()
  status!: string;

  @ApiProperty({ enum: ['CASH', 'CARD', 'UPI', 'NETBANKING', 'WALLET'], example: 'UPI' })
  @IsIn(['CASH', 'CARD', 'UPI', 'NETBANKING', 'WALLET'])
  method!: string;
}
