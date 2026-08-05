import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';

import { CreateRecipeDto, RecipeIngredientDto } from './create-recipe.dto';

export class UpdateRecipeDto extends PartialType(CreateRecipeDto) {
  @ApiPropertyOptional({
    type: [RecipeIngredientDto],
    description: 'Replace the full ingredient list when provided',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  @IsOptional()
  override ingredients?: RecipeIngredientDto[];
}
