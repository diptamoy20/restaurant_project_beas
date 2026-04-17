import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';

import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { RestaurantsService } from './restaurants.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('restaurants')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  getRestaurants() {
    return this.restaurantsService.getRestaurants();
  }

  @Get('nearby')
  getNearbyRestaurants(@Query() query: NearbyRestaurantsDto) {
    return this.restaurantsService.findNearbyRestaurants(
      query.latitude,
      query.longitude,
      query.radiusKm,
    );
  }

  @Get(':id')
  getRestaurant(@Param('id', ParseIntPipe) id: number) {
    return this.restaurantsService.getRestaurant(id);
  }
}
