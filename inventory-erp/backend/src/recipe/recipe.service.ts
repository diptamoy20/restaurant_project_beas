import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { IntegrationService } from '../integration/integration.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecipeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrationService: IntegrationService,
  ) {}

  /**
   * Resolves the canonical menu item context from the Restaurant Management System.
   * The RMS is the single source of truth for menu names and categories; the ERP
   * only stores the numeric menuId (and a cached display name).
   */
  private async resolveMenuContext(
    restaurantId: number,
    menuItemId: number,
    menuItemName?: string,
  ) {
    const catalog = await this.integrationService.getMenuCatalog(restaurantId);
    const item = catalog.items.find((i) => i.id === menuItemId);
    if (!item) {
      throw new BadRequestException(
        `Menu item ${menuItemId} was not found in the Restaurant catalog for restaurant ${restaurantId}.`,
      );
    }
    return {
      name: menuItemName?.trim() || item.name,
      categoryId: item.categoryId,
    };
  }

  async createRecipe(dto: CreateRecipeDto) {
    const existing = await this.prisma.recipe.findUnique({
      where: {
        restaurantId_menuItemId: { restaurantId: dto.restaurantId, menuItemId: dto.menuItemId },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `A recipe for this menu item already exists for restaurant ${dto.restaurantId}. Update it instead.`,
      );
    }

    const { name, categoryId } = await this.resolveMenuContext(
      dto.restaurantId,
      dto.menuItemId,
      dto.menuItemName,
    );

    return this.prisma.recipe.create({
      data: {
        restaurantId: dto.restaurantId,
        categoryId: dto.categoryId ?? categoryId,
        menuItemId: dto.menuItemId,
        menuItemName: name,
        yieldQuantity: dto.yieldQuantity || 1,
        isActive: dto.isActive ?? true,
        ingredients: {
          create: dto.ingredients.map((item) => ({
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            wastagePct: item.wastagePct || 0,
          })),
        },
      },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });
  }

  async getRecipes(restaurantId?: number) {
    const recipes = await this.prisma.recipe.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      include: {
        ingredients: { include: { ingredient: true } },
      },
      orderBy: [{ restaurantId: 'asc' }, { menuItemName: 'asc' }],
    });

    if (recipes.length === 0) return recipes;

    const nameMap = await this.integrationService.getRestaurantIdNameMap();

    return recipes.map((recipe) => ({
      ...recipe,
      restaurantName: nameMap.get(recipe.restaurantId) ?? null,
    }));
  }

  async getRecipeByMenuItem(restaurantId: number, menuItemId: number) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { restaurantId_menuItemId: { restaurantId, menuItemId } },
      include: {
        ingredients: { include: { ingredient: true } },
      },
    });
    if (!recipe) {
      throw new NotFoundException(
        `No recipe found for menu item ${menuItemId} in restaurant ${restaurantId}`,
      );
    }
    return recipe;
  }

  async updateRecipe(id: number, dto: UpdateRecipeDto) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');

    const restaurantId = dto.restaurantId;
    const menuItemId = dto.menuItemId;
    let menuItemName = dto.menuItemName;
    let categoryId = dto.categoryId;

    // When the recipe is re-pointed at a (possibly different) menu item, resolve
    // the canonical name + category from the Restaurant Management System.
    if (restaurantId !== undefined || menuItemId !== undefined) {
      const targetRestaurantId = restaurantId ?? recipe.restaurantId;
      const targetMenuItemId = menuItemId ?? recipe.menuItemId;
      const resolved = await this.resolveMenuContext(
        targetRestaurantId,
        targetMenuItemId,
        menuItemName,
      );

      if (menuItemName === undefined) menuItemName = resolved.name;
      if (categoryId === undefined) categoryId = resolved.categoryId;

      const conflicting = await this.prisma.recipe.findUnique({
        where: {
          restaurantId_menuItemId: {
            restaurantId: targetRestaurantId,
            menuItemId: targetMenuItemId,
          },
        },
      });
      if (conflicting && conflicting.id !== id) {
        throw new BadRequestException(
          'A recipe for this menu item already exists for that restaurant. Update it instead.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await tx.recipeIngredient.createMany({
          data: dto.ingredients.map((item) => ({
            recipeId: id,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            unit: item.unit,
            wastagePct: item.wastagePct || 0,
          })),
        });
      }

      const updateData: Record<string, unknown> = {};
      if (restaurantId !== undefined) updateData.restaurantId = restaurantId;
      if (menuItemId !== undefined) updateData.menuItemId = menuItemId;
      if (menuItemName !== undefined) updateData.menuItemName = menuItemName;
      if (categoryId !== undefined) updateData.categoryId = categoryId;
      if (dto.yieldQuantity !== undefined) updateData.yieldQuantity = dto.yieldQuantity;
      if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

      return tx.recipe.update({
        where: { id },
        data: updateData,
        include: {
          ingredients: { include: { ingredient: true } },
        },
      });
    });
  }

  async deleteRecipe(id: number) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id } });
    if (!recipe) throw new NotFoundException('Recipe not found');
    return this.prisma.recipe.delete({ where: { id } });
  }

  async getMenuCatalog(restaurantId: number) {
    return this.integrationService.getMenuCatalog(restaurantId);
  }
}
