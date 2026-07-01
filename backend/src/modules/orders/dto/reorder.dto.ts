import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class ReorderDto {
  @ApiProperty({
    example: 145,
    description: 'ID of the previously delivered order to reorder.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId!: number;
}
