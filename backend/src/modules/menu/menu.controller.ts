import { Controller, Get, Param, ParseIntPipe, Query, Req } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

import { MenuResponseDto, PaginatedMenuQueryDto } from './dto';
import { BestSellingQueryDto } from './dto/best-selling-query.dto';
import { MenuItemDto } from './dto/menu-item.dto';
import { MenuService } from './menu.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { AllowWeb } from '../../common/decorators/client.decorator';

class GetMenuDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  restaurantId!: number;
}

@Controller('menu')
@ApiTags('Menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('best-selling')
  @AllowWeb()
  @ApiOperation({ summary: 'Best selling menu items (active, with restaurant)' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, example: 2 })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number, example: 1 })
  @ApiOkResponse({ type: MenuItemDto, isArray: true })
  getBestSelling(
    @Query() query: BestSellingQueryDto,
  ): ReturnType<MenuService['getBestSellingItems']> {
    return this.menuService.getBestSellingItems({
      lat: query.lat,
      lng: query.lng,
      limit: query.limit,
      categoryId: query.categoryId,
      restaurantId: query.restaurantId,
    });
  }

  @Get('restaurant/:restaurantId/frequent')
  @AllowWeb()
  @ApiOperation({ summary: 'Get frequently ordered menu items for a user at a restaurant' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiOkResponse({ type: MenuItemDto, isArray: true })
  getFrequent(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() request: any,
  ): Promise<MenuItemDto[]> {
    const userId = request.user?.id;
    return this.menuService.getFrequentItems(restaurantId, userId);
  }

  @Get('restaurant/:restaurantId')
  @AllowWeb()
  @ApiOperation({ summary: 'Get menu for a restaurant' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 88.3639 })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Category id',
    example: 2,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  getMenu(
    @Param() params: GetMenuDto,
    @Query() query: PaginatedMenuQueryDto,
  ): Promise<MenuResponseDto> {
    const hasCoordinates =
      query.lat !== undefined ||
      query.lng !== undefined ||
      query.latitude !== undefined ||
      query.longitude !== undefined;

    if (!hasCoordinates) {
      return this.menuService.getMenuByRestaurant(params.restaurantId, {
        categoryId: query.categoryId,
        limit: query.limit,
        offset: query.offset,
      });
    }

    return this.menuService.getMenuByRestaurant(params.restaurantId, {
      coordinates: query.getCoordinates(),
      categoryId: query.categoryId,
      limit: query.limit,
      offset: query.offset,
    });
  }
}
