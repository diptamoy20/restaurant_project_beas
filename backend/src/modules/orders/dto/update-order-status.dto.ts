import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber } from 'class-validator';

import { ORDER_STATUSES } from '../constants/order-status.constants';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  orderId!: number;

  @ApiProperty({ enum: ORDER_STATUSES, example: 'CONFIRMED' })
  @IsIn(ORDER_STATUSES)
  status!: (typeof ORDER_STATUSES)[number];
}
