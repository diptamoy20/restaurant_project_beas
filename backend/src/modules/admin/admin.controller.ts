import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
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
import {
  DashboardOverviewQueryDto,
  DashboardOverviewResponseDto,
} from './dto/dashboard-overview.dto';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import {
  CreateStaffUserDto,
  StaffUserDto,
  UpdateStaffPasswordDto,
  UpdateStaffPermissionsDto,
  UpdateStaffStatusDto,
  UpdateStaffUserDto,
} from './dto/staff.dto';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

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

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get filtered multi-restaurant business dashboard overview' })
  @ApiOkResponse({ type: DashboardOverviewResponseDto })
  getDashboardOverview(
    @Query() query: DashboardOverviewQueryDto,
  ): Promise<DashboardOverviewResponseDto> {
    return this.adminService.getDashboardOverview(query);
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
  @Patch('staff/:id')
  @ApiOperation({ summary: 'Update staff user details, role, and permissions' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStaffUserDto })
  @ApiOkResponse({ type: StaffUserDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateStaffUserDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<StaffUserDto> {
    return this.adminService.updateStaff(id, payload, request.user);
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

  @Roles(Role.ADMIN)
  @Patch('staff/:id/password')
  @ApiOperation({ summary: 'Reset a staff or delivery boy password' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStaffPasswordDto })
  @ApiOkResponse({ type: StaffUserDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateStaffPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateStaffPasswordDto,
  ): Promise<StaffUserDto> {
    return this.adminService.updateStaffPassword(id, payload);
  }

  @Roles(Role.ADMIN)
  @Patch('staff/:id/status')
  @ApiOperation({ summary: 'Enable or disable a staff user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateStaffStatusDto })
  @ApiOkResponse({ type: StaffUserDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateStaffStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateStaffStatusDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<StaffUserDto> {
    return this.adminService.updateStaffStatus(id, payload, request.user);
  }

  @Roles(Role.ADMIN)
  @Delete('staff/:id')
  @ApiOperation({ summary: 'Delete a staff user when there is no operational history' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ schema: { example: { deleted: true } } })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  deleteStaff(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<{ deleted: true }> {
    return this.adminService.deleteStaff(id, request.user);
  }
}
