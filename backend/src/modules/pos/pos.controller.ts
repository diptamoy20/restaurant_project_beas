import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';
import { PosMenuQueryDto } from './dto/pos-menu-query.dto';
import { PosMenuResponseDto } from './dto/pos-menu-response.dto';
import { PosService } from './pos.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('POS')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'Get POS dashboard metrics' })
  @ApiOkResponse({ type: PosDashboardResponseDto })
  async getDashboard(@Request() req: { user: AuthenticatedUser }): Promise<{
    success: boolean;
    message: string;
    data: PosDashboardResponseDto;
  }> {
    const data = await this.posService.getDashboard(req.user);
    return {
      success: true,
      message: 'POS dashboard fetched successfully',
      data,
    };
  }

  @Get('menu')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'Get POS menu for the authenticated staff member restaurant' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search menu items by name (case-insensitive, partial match)',
    example: 'burger',
  })
  @ApiOkResponse({ type: PosMenuResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiForbiddenResponse({ description: 'User is inactive or not associated with a restaurant' })
  async getMenu(
    @Request() req: { user: AuthenticatedUser },
    @Query() query: PosMenuQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PosMenuResponseDto;
  }> {
    const data = await this.posService.getPosMenu(req.user, query);
    return {
      success: true,
      message: 'POS menu fetched successfully',
      data,
    };
  }
}
