import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';
import { RestaurantsService } from './restaurants.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CoordinatesQueryDto } from '../location/dto/coordinates-query.dto';
import { MenuResponseDto } from '../menu/dto';
import { MenuService } from '../menu/menu.service';

@Controller(['restaurants', 'v1/restaurants'])
@Public()
@ApiTags('Restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly menuService: MenuService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List active restaurants' })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  async getRestaurants(): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.getRestaurants();
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby restaurants using coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: true, type: Number, example: 88.3639 })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  @ApiStandardErrorResponses({ badRequest: true })
  async getNearbyRestaurants(
    @Query() query: NearbyRestaurantsDto,
  ): Promise<RestaurantResponseDto[]> {
    const { lat, lng } = query.getCoordinates();

    return this.restaurantsService.findNearbyRestaurants({
      lat,
      lng,
      radiusKm: query.radiusKm ?? 10,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get(':id/menu')
  @ApiOperation({ summary: 'Get restaurant menu with delivery quote for coordinates' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 88.3639 })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getRestaurantMenu(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CoordinatesQueryDto,
  ): Promise<MenuResponseDto> {
    const hasCoordinates =
      query.lat !== undefined ||
      query.lng !== undefined ||
      query.latitude !== undefined ||
      query.longitude !== undefined;

    if (!hasCoordinates) {
      return this.menuService.getMenuByRestaurant(id);
    }

    const { lat, lng } = query.getCoordinates();

    return this.menuService.getMenuByRestaurant(id, { lat, lng });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get restaurant by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: RestaurantResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getRestaurant(@Param('id', ParseIntPipe) id: number): Promise<RestaurantResponseDto> {
    return this.restaurantsService.getRestaurant(id);
  }
}
