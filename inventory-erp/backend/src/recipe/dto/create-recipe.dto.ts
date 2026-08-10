import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  ingredientId!: number;

  @ApiProperty({ example: 0.15, description: 'Weight/Volume required per portion' })
  @IsNumber()
  @Min(0.0001)
  quantity!: number;

  @ApiProperty({ example: 'KG' })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @ApiPropertyOptional({ example: 5, description: 'Expected wastage percentage' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  wastagePct?: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 3, description: 'Restaurant (branch) this BOM belongs to' })
  @IsNumber()
  restaurantId!: number;

  @ApiPropertyOptional({ example: 14, description: 'Menu category id from Restaurant Panel' })
  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @ApiProperty({ example: 42, description: 'ID of menu item from Restaurant Panel' })
  @IsNumber()
  menuItemId!: number;

  @ApiPropertyOptional({
    example: 'Chicken Biryani',
    description: 'Resolved automatically from the Restaurant Panel when omitted',
  })
  @IsString()
  @IsOptional()
  menuItemName?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(0.1)
  @IsOptional()
  yieldQuantity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ type: [RecipeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];
}
