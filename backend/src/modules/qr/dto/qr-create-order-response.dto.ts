import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class QRCreateOrderResponseDto {
  @ApiProperty({ example: 123, description: 'Order ID' })
  @IsNumber()
  orderId!: number;

  @ApiProperty({ example: 'ORD-1640995200000', description: 'Order number' })
  @IsString()
  orderNumber!: string;

  @ApiProperty({ example: 'PLACED', description: 'Order status' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 20, description: 'Estimated preparation time in minutes' })
  @IsNumber()
  estimatedTime!: number;
}