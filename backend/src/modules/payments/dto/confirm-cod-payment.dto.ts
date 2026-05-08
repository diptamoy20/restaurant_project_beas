import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class ConfirmCodPaymentDto {
  @ApiProperty({ example: 101 })
  @Type(() => Number)
  @IsInt()
  orderId!: number;
}
