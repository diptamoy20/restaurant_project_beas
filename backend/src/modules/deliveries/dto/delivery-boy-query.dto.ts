import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

import { DELIVERY_STATUS } from '../../../common/constants/delivery-status';

export class DeliveryBoyOrdersQueryDto {
  @ApiPropertyOptional({
    enum: [
      DELIVERY_STATUS.ASSIGNED,
      DELIVERY_STATUS.OUT_FOR_DELIVERY,
      DELIVERY_STATUS.ON_THE_WAY,
      DELIVERY_STATUS.DELIVERED,
    ],
  })
  @IsOptional()
  @IsIn([
    DELIVERY_STATUS.ASSIGNED,
    DELIVERY_STATUS.OUT_FOR_DELIVERY,
    DELIVERY_STATUS.ON_THE_WAY,
    DELIVERY_STATUS.DELIVERED,
  ])
  status?: string;

  @ApiPropertyOptional({ example: 20, default: 20, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 0, default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
