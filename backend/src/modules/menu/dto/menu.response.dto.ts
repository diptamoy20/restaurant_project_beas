import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber } from 'class-validator';

import { MenuItemDto } from './menu-item.dto';

export class MenuResponseDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ type: () => MenuItemDto, isArray: true })
  @IsArray()
  items!: MenuItemDto[];
}
