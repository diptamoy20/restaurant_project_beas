import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

import { ADMIN_ORDER_STATUSES } from '../../../common/constants/order-status';

export class UpdateOrderStatusDto {
  @ApiProperty({ example: 'PREPARING', enum: ADMIN_ORDER_STATUSES })
  @IsString()
  @IsIn([...ADMIN_ORDER_STATUSES])
  status!: string;

  @ApiProperty({
    example: 'Restaurant is unable to fulfil this order',
    required: false,
  })
  @ValidateIf((payload: UpdateOrderStatusDto) => payload.status === 'CANCELLED')
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  cancellationReason?: string;
}
