import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

import { MenuVariantDto } from './menu-variant.dto';
import { MenuAddonGroupDto } from './addon.dto';

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

  @ApiPropertyOptional({ type: () => MenuAddonGroupDto, isArray: true })
  @IsOptional()
  @IsArray()
  addonGroups?: MenuAddonGroupDto[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/pizza.png', nullable: true })
  @IsOptional()
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Fresh basil, tomato, mozzarella', nullable: true })
  @IsOptional()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Tomato, basil, mozzarella', nullable: true })
  @IsOptional()
  ingredients?: string | null;

  @ApiPropertyOptional({ example: 149 })
  @IsOptional()
  discountPrice?: number | null;

  @ApiPropertyOptional({ example: 'VEG' })
  @IsOptional()
  foodType?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  spicyLevel?: number | null;

  @ApiPropertyOptional({ example: 4.6 })
  @IsOptional()
  rating?: number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isBestSelling?: boolean;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  preparationTime?: number | null;
}
