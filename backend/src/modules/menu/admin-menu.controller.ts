import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateAdminMenuItemDto, UpdateAdminMenuItemDto } from './dto/admin-menu-item.dto';
import { MenuItemDto } from './dto/menu-item.dto';
import { MenuResponseDto } from './dto/menu.response.dto';
import { MenuService } from './menu.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin')
@ApiTags('Admin Menu')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class AdminMenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('restaurants/:restaurantId/menu')
  @ApiOperation({ summary: 'List all menu items for a restaurant (admin)' })
  @ApiParam({ name: 'restaurantId', type: Number })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ notFound: true })
  getRestaurantMenu(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
  ): Promise<MenuResponseDto> {
    return this.menuService.getAdminMenuForRestaurant(restaurantId);
  }

  @Post('restaurants/:restaurantId/menu')
  @ApiOperation({ summary: 'Create a menu item for a restaurant' })
  @ApiParam({ name: 'restaurantId', type: Number })
  @ApiCreatedResponse({ type: MenuItemDto })
  @ApiStandardErrorResponses({ badRequest: true })
  createMenuItem(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Body() body: CreateAdminMenuItemDto,
  ): Promise<MenuItemDto> {
    return this.menuService.createAdminMenuItem(restaurantId, body);
  }

  @Put('menu/:id')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: MenuItemDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateMenuItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminMenuItemDto,
  ): Promise<MenuItemDto> {
    return this.menuService.updateAdminMenuItem(id, body);
  }

  @Delete('menu/:id')
  @ApiOperation({ summary: 'Delete a menu item' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ schema: { example: { ok: true } } })
  @ApiStandardErrorResponses({ notFound: true })
  deleteMenuItem(@Param('id', ParseIntPipe) id: number): Promise<{ ok: boolean }> {
    return this.menuService.deleteAdminMenuItem(id);
  }
}
