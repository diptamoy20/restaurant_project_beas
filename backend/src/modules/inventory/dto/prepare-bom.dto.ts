import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

export class PreparationItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  menuItemId!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class PrepareBomDto {
  @ApiProperty({
    type: [PreparationItemDto],
    example: [
      { menuItemId: 1, quantity: 20 },
      { menuItemId: 2, quantity: 10 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PreparationItemDto)
  items!: PreparationItemDto[];
}