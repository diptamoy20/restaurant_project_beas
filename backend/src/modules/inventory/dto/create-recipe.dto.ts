import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientDto {
  @ApiProperty({ example: 1, description: 'InventoryItem ID' })
  @IsNumber()
  itemId!: number;

  @ApiProperty({ example: 250, description: 'Quantity required per portion' })
  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @ApiProperty({ example: 'GM' })
  @IsString()
  @IsNotEmpty()
  unit!: string;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 1, description: 'MenuItem ID' })
  @IsNumber()
  menuItemId!: number;

  @ApiProperty({ example: 'Chicken Biryani Standard Recipe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  yieldQuantity?: number;

  @ApiProperty({ type: [RecipeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
