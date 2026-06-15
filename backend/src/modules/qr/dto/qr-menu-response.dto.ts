import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class QRMenuItemVariantDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Large' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 150 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;
}

export class QRMenuAddonOptionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 40 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;
}

export class QRMenuAddonGroupDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Extra Toppings' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'MULTI', enum: ['SINGLE', 'MULTI'] })
  @IsString()
  selectionType!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isRequired!: boolean;

  @ApiPropertyOptional({ example: 0, nullable: true })
  @IsOptional()
  @IsNumber()
  minSelect?: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  @IsOptional()
  @IsNumber()
  maxSelect?: number | null;

  @ApiPropertyOptional({ type: () => QRMenuAddonOptionDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRMenuAddonOptionDto)
  options?: QRMenuAddonOptionDto[];
}

export class QRMenuItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Margherita Pizza' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Fresh tomato sauce, mozzarella, basil' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/menu-item.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;

  @ApiProperty({ example: 250 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isAvailable!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  isBestSelling!: boolean;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  preparationTime?: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  categoryId!: number;

  @ApiPropertyOptional({ type: () => QRMenuItemVariantDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRMenuItemVariantDto)
  variants?: QRMenuItemVariantDto[];

  @ApiPropertyOptional({ type: () => QRMenuAddonGroupDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRMenuAddonGroupDto)
  addonGroups?: QRMenuAddonGroupDto[];
}

export class QRMenuCategoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: 'Pizza' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Wood-fired pizzas' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ type: () => QRMenuItemDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRMenuItemDto)
  items!: QRMenuItemDto[];
}

export class QRRestaurantInfoDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  id!: number;

  @ApiProperty({ example: "Mario's Pizzeria" })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'Authentic Italian cuisine' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ example: 12 })
  @IsNumber()
  tableId!: number;

  @ApiProperty({ example: 'Table 12' })
  @IsString()
  tableName!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  gstEnabled!: boolean;

  @ApiProperty({ example: 5 })
  @IsNumber()
  gstRate!: number;
}

export class QRMenuResponseDto {
  @ApiProperty({ type: () => QRRestaurantInfoDto })
  @ValidateNested()
  @Type(() => QRRestaurantInfoDto)
  restaurant!: QRRestaurantInfoDto;

  @ApiProperty({ type: () => QRMenuCategoryDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QRMenuCategoryDto)
  categories!: QRMenuCategoryDto[];
}
