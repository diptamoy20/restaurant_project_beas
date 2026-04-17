import { IsNumber, IsString } from 'class-validator';

export class OrderSummaryDto {
  @IsNumber()
  id!: number;

  @IsString()
  orderNumber!: string;

  @IsString()
  status!: string;

  @IsNumber()
  totalAmount!: number;

  @IsString()
  paymentStatus!: string;
}
