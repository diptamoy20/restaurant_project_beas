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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRestaurants(): Promise<any> {
    return this.restaurantsService.getRestaurants();
  }

  @Get('nearby')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getNearbyRestaurants(@Query() query: NearbyRestaurantsDto): Promise<any> {
    return this.restaurantsService.findNearbyRestaurants(
      query.latitude,
      query.longitude,
      query.radiusKm,
    );
  }

  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getRestaurant(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.restaurantsService.getRestaurant(id);
  }
}
