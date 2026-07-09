import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { DELIVERY_STATUS } from '../../../common/constants/delivery-status';

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    enum: [DELIVERY_STATUS.DELIVERED],
    example: DELIVERY_STATUS.DELIVERED,
  })
  @IsIn([DELIVERY_STATUS.DELIVERED])
  status!: string;
}
