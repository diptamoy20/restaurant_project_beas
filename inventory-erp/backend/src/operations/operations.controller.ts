import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

import { OperationsService } from './operations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import {
  CreateBranchStoreRequestDto,
  CreateKitchenRequestDto,
  CreateKitchenTransferDto,
  CreateWasteDto,
} from './dto/operations.dto';

@ApiTags('Restaurant Operations Workspace')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('operations')
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  @Get(':slug/dashboard')
  @ApiOperation({ summary: 'Get restaurant workspace dashboard' })
  getDashboard(@Param('slug') slug: string) {
    return this.operationsService.getDashboard(slug);
  }

  @Get(':slug/store-inventory')
  @ApiOperation({ summary: 'Get restaurant store inventory' })
  getStoreInventory(@Param('slug') slug: string) {
    return this.operationsService.getStoreInventory(slug);
  }

  @Get(':slug/kitchen-inventory')
  @ApiOperation({ summary: 'Get restaurant kitchen inventory' })
  getKitchenInventory(@Param('slug') slug: string) {
    return this.operationsService.getKitchenInventory(slug);
  }

  @Get(':slug/kitchen-requests')
  @ApiOperation({ summary: 'Get restaurant kitchen requests' })
  getKitchenRequests(@Param('slug') slug: string) {
    return this.operationsService.getKitchenRequests(slug);
  }

  @Post(':slug/kitchen-requests')
  @ApiOperation({ summary: 'Create a kitchen request (kitchen → store)' })
  createKitchenRequest(
    @Param('slug') slug: string,
    @Body() dto: CreateKitchenRequestDto,
    @Req() req: any,
  ) {
    return this.operationsService.createKitchenRequest(slug, dto, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.STORE_MANAGER)
  @Put(':slug/kitchen-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a kitchen request' })
  approveKitchenRequest(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.operationsService.approveKitchenRequest(id, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.STORE_MANAGER)
  @Put(':slug/kitchen-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a kitchen request' })
  rejectKitchenRequest(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.operationsService.rejectKitchenRequest(slug, id, req.user.id);
  }

  @Get(':slug/kitchen-transfers')
  @ApiOperation({ summary: 'Get restaurant kitchen transfers' })
  getKitchenTransfers(@Param('slug') slug: string) {
    return this.operationsService.getKitchenTransfers(slug);
  }

  @Post(':slug/kitchen-transfers')
  @ApiOperation({ summary: 'Create a kitchen transfer (store → kitchen)' })
  createKitchenTransfer(
    @Param('slug') slug: string,
    @Body() dto: CreateKitchenTransferDto,
    @Req() req: any,
  ) {
    return this.operationsService.createKitchenTransfer(slug, dto, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.STORE_MANAGER)
  @Put(':slug/kitchen-transfers/:id/approve')
  @ApiOperation({ summary: 'Approve a kitchen transfer' })
  approveKitchenTransfer(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.operationsService.approveKitchenTransfer(id, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.STORE_MANAGER)
  @Put(':slug/kitchen-transfers/:id/dispatch')
  @ApiOperation({ summary: 'Dispatch a kitchen transfer (move inventory from store to kitchen)' })
  dispatchKitchenTransfer(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.operationsService.dispatchKitchenTransfer(slug, id, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.STORE_MANAGER)
  @Put(':slug/kitchen-transfers/:id/reject')
  @ApiOperation({ summary: 'Reject a kitchen transfer' })
  rejectKitchenTransfer(
    @Param('slug') slug: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.operationsService.rejectKitchenTransfer(slug, id, req.user.id);
  }

  @Get(':slug/consumption')
  @ApiOperation({ summary: 'Get restaurant consumption history' })
  getConsumption(@Param('slug') slug: string) {
    return this.operationsService.getConsumption(slug);
  }

  @Get(':slug/waste')
  @ApiOperation({ summary: 'Get restaurant waste logs' })
  getWaste(@Param('slug') slug: string) {
    return this.operationsService.getWaste(slug);
  }

  @Post(':slug/waste')
  @ApiOperation({ summary: 'Log waste for the restaurant' })
  createWaste(@Param('slug') slug: string, @Body() dto: CreateWasteDto, @Req() req: any) {
    return this.operationsService.createWaste(slug, dto, req.user.id);
  }

  @Get(':slug/reports')
  @ApiOperation({ summary: 'Get restaurant reports' })
  getReports(@Param('slug') slug: string) {
    return this.operationsService.getReports(slug);
  }

  @Get(':slug/store-requests')
  @ApiOperation({ summary: 'Get branch store requests for this restaurant' })
  getStoreRequests(@Param('slug') slug: string) {
    return this.operationsService.getStoreRequests(slug);
  }

  @Post(':slug/store-requests')
  @ApiOperation({ summary: 'Create a branch store request (restaurant → warehouse)' })
  createStoreRequest(
    @Param('slug') slug: string,
    @Body() dto: CreateBranchStoreRequestDto,
    @Req() req: any,
  ) {
    return this.operationsService.createStoreRequest(slug, dto, req.user.id);
  }
}
