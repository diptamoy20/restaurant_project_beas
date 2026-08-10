import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeService } from './recipe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Recipes (Bill of Materials)')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('recipes')
export class RecipeController {
  constructor(private readonly recipeService: RecipeService) {}

  @Get()
  @ApiOperation({
    summary: 'List all Recipes / Bill of Materials (optionally filtered by restaurant)',
  })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  getRecipes(@Query('restaurantId') restaurantId?: string) {
    return this.recipeService.getRecipes(restaurantId ? Number(restaurantId) : undefined);
  }

  @Get('catalog/:restaurantId')
  @ApiOperation({
    summary:
      'Fetch menu catalog (categories + items) for a restaurant from the Restaurant Management System',
  })
  getMenuCatalog(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.recipeService.getMenuCatalog(restaurantId);
  }

  @Get('menu-item/:restaurantId/:menuItemId')
  @ApiOperation({ summary: 'Get recipe mapped to a specific restaurant menu item' })
  getRecipeByMenuItem(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
  ) {
    return this.recipeService.getRecipeByMenuItem(restaurantId, menuItemId);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create new Bill of Materials recipe for a restaurant menu item' })
  createRecipe(@Body() dto: CreateRecipeDto) {
    return this.recipeService.createRecipe(dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Put(':id')
  @ApiOperation({ summary: 'Update recipe ingredients, yields or menu mapping' })
  updateRecipe(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecipeDto) {
    return this.recipeService.updateRecipe(id, dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete recipe' })
  deleteRecipe(@Param('id', ParseIntPipe) id: number) {
    return this.recipeService.deleteRecipe(id);
  }
}
