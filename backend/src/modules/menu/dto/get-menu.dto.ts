import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

export class GetMenuDto {
  @Type(() => Number)
  @IsNumber()
  restaurantId!: number;
}

