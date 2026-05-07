import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';
import { RestaurantsService } from './restaurants.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('restaurants')
@Public()
@ApiTags('Restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'List active restaurants' })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  async getRestaurants(): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.getRestaurants();
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Find nearby restaurants using coordinates' })
  @ApiQuery({ name: 'latitude', required: true, type: Number, example: 12.9716 })
  @ApiQuery({ name: 'longitude', required: true, type: Number, example: 77.5946 })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 10 })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  @ApiStandardErrorResponses({ badRequest: true })
  async getNearbyRestaurants(
    @Query() query: NearbyRestaurantsDto,
  ): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.findNearbyRestaurants(
      query.latitude,
      query.longitude,
      query.radiusKm,
    );
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
