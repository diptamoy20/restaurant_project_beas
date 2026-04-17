import { Controller, Get, Param } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

import { MenuResponseDto } from './dto';
import { MenuService } from './menu.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

class GetMenuDto {
  @Type(() => Number)
  @IsNumber()
  restaurantId!: number;
}

@Controller('menu')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('restaurant/:restaurantId')
  getMenu(@Param() params: GetMenuDto): Promise<MenuResponseDto> {
    return this.menuService.getMenuByRestaurant(params.restaurantId);
  }
}
