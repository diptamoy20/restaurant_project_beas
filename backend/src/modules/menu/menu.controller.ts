import { Controller, Get, Param, Query } from '@nestjs/common';
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

import { MenuResponseDto } from './dto';
import { MenuItemDto } from './dto/menu-item.dto';
import { MenuService } from './menu.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { AllowWeb } from '../../common/decorators/client.decorator';
import { CoordinatesQueryDto } from '../location/dto/coordinates-query.dto';

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
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ type: MenuItemDto, isArray: true })
  getBestSelling(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('limit') limit?: number,
  ): ReturnType<MenuService['getBestSellingItems']> {
    return this.menuService.getBestSellingItems({
      lat: lat !== undefined ? Number(lat) : undefined,
      lng: lng !== undefined ? Number(lng) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
    });
  }

  @Get('restaurant/:restaurantId')
  @AllowWeb()
  @ApiOperation({ summary: 'Get menu for a restaurant' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 88.3639 })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  getMenu(
    @Param() params: GetMenuDto,
    @Query() query: CoordinatesQueryDto,
  ): Promise<MenuResponseDto> {
    const hasCoordinates =
      query.lat !== undefined ||
      query.lng !== undefined ||
      query.latitude !== undefined ||
      query.longitude !== undefined;

    if (!hasCoordinates) {
      return this.menuService.getMenuByRestaurant(params.restaurantId);
    }

    return this.menuService.getMenuByRestaurant(params.restaurantId, query.getCoordinates());
  }
}
