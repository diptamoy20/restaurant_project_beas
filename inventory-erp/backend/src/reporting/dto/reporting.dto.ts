import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateWasteLogDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 'SPOILAGE' })
  @IsString()
  @IsNotEmpty()
  wasteType!: string; // SPOILAGE, EXPIRED, COOKING_WASTE, DAMAGED_STOCK

  @ApiPropertyOptional({ example: 'Tomatoes spoiled in storage' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateMaterialReturnDto {
  @ApiProperty({ example: 'KITCHEN' })
  @IsString()
  @IsNotEmpty()
  fromType!: string;

  @ApiProperty({ example: 'STORE' })
  @IsString()
  @IsNotEmpty()
  toType!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  warehouseId?: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @ApiProperty({ example: 'Excess stock return' })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
