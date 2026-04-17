import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { MenuService } from './menu.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('menu')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('restaurant/:restaurantId')
  getMenu(@Param('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.menuService.getMenuByRestaurant(restaurantId);
  }
}
