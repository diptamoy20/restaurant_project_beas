import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

import { ADMIN_ORDER_STATUSES } from '../../../common/constants/order-status';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'PREPARING', enum: ADMIN_ORDER_STATUSES })
  @IsString()
  @IsIn([...ADMIN_ORDER_STATUSES])
  status!: string;
}
