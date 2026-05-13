import { Module } from '@nestjs/common';

import { AdminMenuController } from './admin-menu.controller';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [LocationModule],
  controllers: [MenuController, AdminMenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
