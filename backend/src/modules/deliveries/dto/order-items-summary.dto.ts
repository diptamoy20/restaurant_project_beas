import { ApiProperty } from '@nestjs/swagger';

export class OrderItemsSummaryDto {
  @ApiProperty()
  itemCount!: number;

  @ApiProperty()
  totalQuantity!: number;
}