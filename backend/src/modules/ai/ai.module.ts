import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

import { MenuModule } from '../menu/menu.module';
import { RestaurantsModule } from '../restaurants/restaurants.module';

@Module({
  imports: [
    MenuModule,
    RestaurantsModule,
  ],

  controllers: [
    AiController,
  ],

  providers: [
    AiService,
  ],

  exports: [
    AiService,
  ],
})
export class AiModule {}