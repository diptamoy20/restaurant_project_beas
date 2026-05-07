import { Module } from '@nestjs/common';

import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { LocationModule } from '../location/location.module';
import { MenuModule } from '../menu/menu.module';

@Module({
  imports: [LocationModule, MenuModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
