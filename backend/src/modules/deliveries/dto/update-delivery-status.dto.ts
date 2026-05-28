import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { DELIVERY_STATUS } from '../../../common/constants/delivery-status';

export class UpdateDeliveryStatusDto {
  @ApiProperty({
    enum: [DELIVERY_STATUS.ON_THE_WAY, DELIVERY_STATUS.DELIVERED],
    example: DELIVERY_STATUS.ON_THE_WAY,
  })
  @IsIn([DELIVERY_STATUS.ON_THE_WAY, DELIVERY_STATUS.DELIVERED])
  status!: string;
}
