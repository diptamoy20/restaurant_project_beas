import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';
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
}
