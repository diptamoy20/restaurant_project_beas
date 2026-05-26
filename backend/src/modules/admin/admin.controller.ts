import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { CreateStaffUserDto, StaffUserDto, UpdateStaffPermissionsDto } from './dto/staff.dto';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiTags('Admin')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard summary metrics' })
  @ApiOkResponse({ type: DashboardResponseDto })
  getDashboard(): Promise<DashboardResponseDto> {
    return this.adminService.getDashboard();
  }

  @Roles(Role.ADMIN)
  @Get('staff')
  @ApiOperation({ summary: 'List admin, manager, and delivery staff users' })
  @ApiOkResponse({ type: StaffUserDto, isArray: true })
  listStaff(): Promise<StaffUserDto[]> {
    return this.adminService.listStaff();
  }

  @Roles(Role.ADMIN)
  @Post('staff')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create a staff user. Delivery boys get a linked delivery agent profile.',
  })
  @ApiBody({ type: CreateStaffUserDto })
  @ApiCreatedResponse({ type: StaffUserDto })
  @ApiStandardErrorResponses({ badRequest: true })
  createStaff(@Body() payload: CreateStaffUserDto): Promise<StaffUserDto> {
    return this.adminService.createStaff(payload);
  }

  @Roles(Role.ADMIN)
  @Patch('staff/:id/permissions')
  @ApiOperation({ summary: 'Accept staff permission updates for admin-panel compatibility' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStaffPermissionsDto })
  @ApiOkResponse({ type: StaffUserDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateStaffPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateStaffPermissionsDto,
  ): Promise<StaffUserDto> {
    return this.adminService.updateStaffPermissions(id, payload);
  }
}
