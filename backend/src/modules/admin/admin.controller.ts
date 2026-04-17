import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminService } from './admin.service';

@Controller('admin')
@Roles(Role.ADMIN, Role.MANAGER)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }
}
