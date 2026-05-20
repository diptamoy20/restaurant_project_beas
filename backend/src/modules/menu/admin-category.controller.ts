import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import {
  AdminCategoryDto,
  CreateAdminCategoryDto,
  UpdateAdminCategoryDto,
} from './dto/admin-category.dto';
import { MenuService } from './menu.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin')
@ApiTags('Admin Categories')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class AdminCategoryController {
  constructor(private readonly menuService: MenuService) {}

  @Get('restaurants/:restaurantId/categories')
  @ApiOperation({ summary: 'List categories for a restaurant (admin)' })
  @ApiParam({ name: 'restaurantId', type: Number })
  @ApiOkResponse({ type: AdminCategoryDto, isArray: true })
  @ApiStandardErrorResponses({ notFound: true })
  getRestaurantCategories(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ): Promise<AdminCategoryDto[]> {
    return this.menuService.getAdminCategoriesForRestaurant(restaurantId);
  }

  @Post('restaurants/:restaurantId/categories')
  @ApiOperation({ summary: 'Create a category for a restaurant' })
  @ApiParam({ name: 'restaurantId', type: Number })
  @ApiCreatedResponse({ type: AdminCategoryDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  createCategory(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() body: CreateAdminCategoryDto,
  ): Promise<AdminCategoryDto> {
    return this.menuService.createAdminCategory(restaurantId, body);
  }

  @Put('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: AdminCategoryDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminCategoryDto,
  ): Promise<AdminCategoryDto> {
    return this.menuService.updateAdminCategory(id, body);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete an empty category' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  deleteCategory(@Param('id', ParseIntPipe) id: number): Promise<{ ok: boolean }> {
    return this.menuService.deleteAdminCategory(id);
  }
}
