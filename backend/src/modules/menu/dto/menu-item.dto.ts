import { IsArray, IsBoolean, IsNumber, IsString } from 'class-validator';

import { MenuVariantDto } from './menu-variant.dto';

export class MenuCategoryDto {
  @IsNumber()
  id!: number;

  @IsString()
  name!: string;
}

export class MenuItemDto {
  @IsNumber()
  id!: number;

  @IsString()
  name!: string;

  @IsNumber()
  price!: number;

  @IsBoolean()
  isAvailable!: boolean;

  @IsNumber()
  restaurantId!: number;

  @IsNumber()
  categoryId!: number;

  category!: MenuCategoryDto;

  @IsArray()
  variants!: MenuVariantDto[];
}
