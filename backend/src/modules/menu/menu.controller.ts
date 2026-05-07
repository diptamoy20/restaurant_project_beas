import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';

import { MenuResponseDto } from './dto';
import { MenuService } from './menu.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';

class GetMenuDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsNumber()
  restaurantId!: number;
}

@Controller('menu')
@Public()
@ApiTags('Menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get('restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get menu for a restaurant' })
  @ApiParam({ name: 'restaurantId', type: Number, example: 1 })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  getMenu(@Param() params: GetMenuDto): Promise<MenuResponseDto> {
    return this.menuService.getMenuByRestaurant(params.restaurantId);
  }
}
