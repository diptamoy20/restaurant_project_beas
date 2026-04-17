import { IsArray, IsNumber } from 'class-validator';

import { MenuItemDto } from './menu-item.dto';

export class MenuResponseDto {
  @IsNumber()
  restaurantId!: number;

  @IsArray()
  items!: MenuItemDto[];
}
