import { Controller, Get } from '@nestjs/common';

import { AdminService } from './admin.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin')
@Roles(Role.ADMIN, Role.MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(): Promise<DashboardResponseDto> {
    return this.adminService.getDashboard();
  }
}
