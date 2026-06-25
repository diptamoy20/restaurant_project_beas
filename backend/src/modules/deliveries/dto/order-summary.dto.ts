import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { OrderItemDto } from './order-item.dto';
import { OrderItemsSummaryDto } from './order-items-summary.dto';

export class OrderSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  orderNumber!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  totalAmount!: number;

  @ApiProperty()
  paymentStatus!: string;

  @ApiProperty({
    type: () => OrderItemsSummaryDto,
  })
  @Type(() => OrderItemsSummaryDto)
  itemsSummary!: OrderItemsSummaryDto;

  @ApiProperty({
    type: [OrderItemDto],
  })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}