import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class InitiatePaymentDto {
  @Type(() => Number)
  @IsNumber()
  orderId!: number;

  @Type(() => Number)
  @IsNumber()
  userId!: number;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @IsString()
  status!: string;

  @IsIn(['CASH', 'CARD', 'UPI', 'NETBANKING', 'WALLET'])
  method!: string;
}

