import { Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { FavoritesService } from './favorites.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('Favorites')
@ApiBearerAuth('access-token')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiStandardErrorResponses({ unauthorized: true })
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // ─── POST /favorites/:menuItemId ────────────────────────────────────────────

  @Post(':menuItemId')
  @ApiOperation({ summary: "Add a menu item to the authenticated user's favorites" })
  @ApiParam({ name: 'menuItemId', type: Number, example: 10 })
  @ApiCreatedResponse({
    description: 'Menu item added to favorites',
    schema: {
      example: {
        success: true,
        message: 'Added to favorites',
        data: {
          id: 2,
          userId: 3,
          menuItemId: 14,
          createdAt: '2026-06-29T11:54:47.692Z',
          menuItem: {
            id: 14,
            restaurantId: 1,
            categoryId: 2,
            name: 'Chicken Curry Rice',
            description: 'Homestyle chicken curry served with steamed rice',
            price: 329,
            discountPrice: null,
            imageUrl:
              'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80',
            imagePublicId: null,
            foodType: 'VEG',
            spicyLevel: null,
            ingredients: null,
            isAvailable: true,
            isBestSelling: false,
            popularityScore: 40,
            rating: 4.6,
            preparationTime: 18,
            customizableOptions: null,
          },
        },
      },
    },
  })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  @ApiConflictResponse({ description: 'Menu item already in favorites' })
  async addFavorite(
    @Req() request: { user: AuthenticatedUser },
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
  ): ReturnType<FavoritesService['addFavorite']> {
    return this.favoritesService.addFavorite(request.user.id, menuItemId);
  }

  // ─── GET /favorites ──────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Get all favorite menu items for the authenticated user' })
  @ApiOkResponse({
    description: 'List of favorite menu items',
    schema: {
      example: {
        success: true,
        message: 'Added to favorites',
        data: {
          success: true,
          total: 1,
          data: [
            {
              id: 10,
              restaurantId: 1,
              categoryId: 1,
              name: 'Chicken Wings',
              description: 'Juicy wings glazed with spicy barbecue sauce',
              price: 269,
              discountPrice: null,
              imageUrl:
                'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80',
              imagePublicId: null,
              foodType: 'VEG',
              spicyLevel: null,
              ingredients: null,
              isAvailable: true,
              isBestSelling: false,
              popularityScore: 40,
              rating: 4.6,
              preparationTime: 18,
              customizableOptions: null,
              category: {
                id: 1,
                restaurantId: 1,
                name: 'Starters',
                description: 'Small plates and crispy bites',
              },
              variants: [],
              addonGroups: [],
            },
          ],
        },
      },
    },
  })
  async getFavorites(
    @Req() request: { user: AuthenticatedUser },
  ): ReturnType<FavoritesService['getFavorites']> {
    return this.favoritesService.getFavorites(request.user.id);
  }

  // ─── DELETE /favorites/:menuItemId ──────────────────────────────────────────

  @Delete(':menuItemId')
  @ApiOperation({ summary: "Remove a menu item from the authenticated user's favorites" })
  @ApiParam({ name: 'menuItemId', type: Number, example: 10 })
  @ApiOkResponse({
    description: 'Favorite removed successfully',
    schema: {
      example: {
        success: true,
        message: 'Success',
        data: {
          success: true,
          message: 'Removed from favorites',
        },
      },
    },
  })
  @ApiStandardErrorResponses({ notFound: true })
  async removeFavorite(
    @Req() request: { user: AuthenticatedUser },
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
  ): ReturnType<FavoritesService['removeFavorite']> {
    return this.favoritesService.removeFavorite(request.user.id, menuItemId);
  }
}
