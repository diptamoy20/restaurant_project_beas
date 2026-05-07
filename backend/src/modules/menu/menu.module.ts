import { Module } from '@nestjs/common';

import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [LocationModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
