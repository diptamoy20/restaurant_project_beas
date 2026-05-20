import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuAddonOptionDto {
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

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class MenuAddonGroupDto {
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

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiProperty({ type: () => MenuAddonOptionDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MenuAddonOptionDto)
  options!: MenuAddonOptionDto[];
}

export class UpsertAddonOptionDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({ example: 'Extra Cheese' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 40 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpsertAddonGroupDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id?: number;

  @ApiProperty({ example: 'Extra Toppings' })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'MULTI', enum: ['SINGLE', 'MULTI'] })
  @IsString()
  @IsIn(['SINGLE', 'MULTI'])
  selectionType!: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: 0, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minSelect?: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxSelect?: number | null;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: () => UpsertAddonOptionDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertAddonOptionDto)
  options!: UpsertAddonOptionDto[];
}
