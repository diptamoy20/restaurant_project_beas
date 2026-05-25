import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class OrderSummaryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'ORD-1001' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'PLACED' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 268 })
  @IsNumber()
  totalAmount!: number;

  @ApiProperty({ example: 'PENDING' })
  @IsString()
  paymentStatus!: string;
}
