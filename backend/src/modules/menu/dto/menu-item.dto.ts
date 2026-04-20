import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

import { MenuVariantDto } from './menu-variant.dto';

export class MenuCategoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Main Course' })
  @IsString()
  name!: string;
}

export class MenuItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Paneer Burger' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 189 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  categoryId!: number;

  @ApiProperty({ type: () => MenuCategoryDto })
  category!: MenuCategoryDto;

  @ApiProperty({ type: () => MenuVariantDto, isArray: true })
  @IsArray()
  variants!: MenuVariantDto[];
}
