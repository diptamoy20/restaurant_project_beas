import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

import { CreateMaterialReturnDto, CreateWasteLogDto } from './dto/reporting.dto';
import { ReportingService } from './reporting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Waste, Ledgers, & Reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get main Dashboard KPI metrics and activity timeline' })
  getDashboardStats() {
    return this.reportingService.getDashboardStats();
  }

  @Get('ledger')
  @ApiOperation({
    summary: 'Query stock ledger with pagination, search, filters, sorting & summary',
  })
  getStockLedger(
    @Query('locationType') locationType?: string,
    @Query('warehouseId') warehouseId?: number,
    @Query('restaurantId') restaurantId?: number,
    @Query('ingredientId') ingredientId?: number,
    @Query('refType') refType?: string,
    @Query('movementType') movementType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.reportingService.getStockLedger({
      locationType,
      warehouseId,
      restaurantId,
      ingredientId,
      refType,
      movementType,
      dateFrom,
      dateTo,
      search,
      page,
      pageSize,
      sortBy,
      sortOrder,
    });
  }

  @Get('waste')
  @ApiOperation({ summary: 'Get all Waste Logs' })
  getWasteLogs(@Query('restaurantId') restaurantId?: number) {
    return this.reportingService.getWasteLogs(restaurantId ? Number(restaurantId) : undefined);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.STORE_MANAGER)
  @Post('waste')
  @ApiOperation({ summary: 'Log kitchen/store ingredient wastage (deducts stock & logs ledger)' })
  logWaste(@Body() dto: CreateWasteLogDto, @Req() req: any) {
    return this.reportingService.logWaste(req.user.id, dto);
  }

  @Get('returns')
  @ApiOperation({ summary: 'Get all Return requests' })
  getReturns(@Query('restaurantId') restaurantId?: number) {
    return this.reportingService.getReturns(restaurantId ? Number(restaurantId) : undefined);
  }

  @Post('returns')
  @ApiOperation({ summary: 'Request material return (Kitchen -> Store or Store -> Warehouse)' })
  createReturn(@Body() dto: CreateMaterialReturnDto) {
    return this.reportingService.createReturn(dto);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.WAREHOUSE_MANAGER,
    RoleType.STORE_MANAGER,
  )
  @Put('returns/:id/approve')
  @ApiOperation({ summary: 'Approve material return (adjusts stock levels accordingly)' })
  approveReturn(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reportingService.approveReturn(id, req.user.id);
  }

  @Get('reports/valuation')
  @ApiOperation({ summary: 'Get Store room stock valuation report based on mapped costs' })
  getInventoryValuationReport() {
    return this.reportingService.getInventoryValuationReport();
  }

  @Post('seed-demo')
  @ApiOperation({ summary: 'Seed sample ingredients, recipes, warehouse, and stock balances' })
  seedDemoData() {
    return this.reportingService.seedDemoData();
  }
}
