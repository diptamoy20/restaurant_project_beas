import { Module } from '@nestjs/common';

import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { LocationModule } from '../location/location.module';
import { MenuModule } from '../menu/menu.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [CloudinaryModule, LocationModule, MenuModule, TablesModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService],
})
export class RestaurantsModule {}
