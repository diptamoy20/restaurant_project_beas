import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 189 })
  @Type(() => Number)
  @IsNumber()
  price!: number;
}
