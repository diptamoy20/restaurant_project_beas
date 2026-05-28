import { Module } from '@nestjs/common';

import { AdminCategoryController } from './admin-category.controller';
import { AdminMenuController } from './admin-menu.controller';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { CloudinaryModule } from '../../common/cloudinary/cloudinary.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [CloudinaryModule, LocationModule],
  controllers: [MenuController, AdminMenuController, AdminCategoryController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
