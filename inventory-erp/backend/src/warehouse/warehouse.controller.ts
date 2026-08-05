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

import { CreateGrnDto } from './dto/create-grn.dto';
import { CreatePoDto } from './dto/create-po.dto';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

@ApiTags('Warehouse Workspace')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ── Overview ──────────────────────────────────────────────────────────────

  @Get('overview')
  @ApiOperation({ summary: 'Warehouse launcher overview with KPIs' })
  getOverview() {
    return this.warehouseService.getOverview();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Warehouse workspace dashboard with KPIs + recent data' })
  getDashboard(@Query('warehouseId') warehouseId?: string) {
    return this.warehouseService.getDashboard(warehouseId ? Number(warehouseId) : undefined);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'List warehouse inventory with ingredient details' })
  getInventory(@Query('warehouseId') warehouseId?: string) {
    return this.warehouseService.getInventory(warehouseId ? Number(warehouseId) : undefined);
  }

  // ── Purchase Orders ───────────────────────────────────────────────────────

  @Get('purchase-orders')
  @ApiOperation({ summary: 'List all purchase orders' })
  getPurchaseOrders() {
    return this.warehouseService.getPos();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post('purchase-orders/check-expiry')
  @ApiOperation({ summary: 'Mark all past-validUntil POs as EXPIRED' })
  checkAndExpirePos() {
    return this.warehouseService.checkAndExpirePos();
  }

  @Get('purchase-orders/:id')
  @ApiOperation({ summary: 'Get single purchase order with items, GRNs' })
  getPo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getPo(id);
  }

  @Get('purchase-orders/:id/document')
  @ApiOperation({ summary: 'Get PO document data for preview/print' })
  getPoDocument(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getPoDocument(id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.PROCUREMENT_MANAGER,
    RoleType.PURCHASE_OFFICER,
  )
  @Post('purchase-orders')
  @ApiOperation({ summary: 'Create new Purchase Order in DRAFT status' })
  createPo(@Body() dto: CreatePoDto, @Req() req: any) {
    return this.warehouseService.createPo(req.user.id, dto);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.PROCUREMENT_MANAGER,
    RoleType.PURCHASE_OFFICER,
  )
  @Put('purchase-orders/:id')
  @ApiOperation({ summary: 'Update a DRAFT Purchase Order' })
  updatePo(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreatePoDto>) {
    return this.warehouseService.updatePo(id, dto);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.PROCUREMENT_MANAGER,
    RoleType.PURCHASE_OFFICER,
  )
  @Post('purchase-orders/:id/submit')
  @ApiOperation({ summary: 'Submit DRAFT PO for manager review' })
  submitPo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.submitPo(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post('purchase-orders/:id/approve')
  @ApiOperation({ summary: 'Approve a SUBMITTED PO' })
  approvePo(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.approvePo(id, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post('purchase-orders/:id/reject')
  @ApiOperation({ summary: 'Reject a SUBMITTED PO (manager rejects)' })
  rejectPo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.rejectPo(id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.PROCUREMENT_MANAGER,
    RoleType.PURCHASE_OFFICER,
  )
  @Post('purchase-orders/:id/send')
  @ApiOperation({ summary: 'Send APPROVED PO to supplier' })
  sendPo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.sendPo(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post('purchase-orders/:id/supplier-confirm')
  @ApiOperation({ summary: 'Supplier confirms the SENT PO' })
  supplierConfirmPo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.supplierConfirmPo(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post('purchase-orders/:id/supplier-decline')
  @ApiOperation({ summary: 'Supplier declines the SENT PO' })
  supplierDeclinePo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.supplierDeclinePo(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post('purchase-orders/:id/close')
  @ApiOperation({ summary: 'Close PO after all items fully received' })
  closePo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.closePo(id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.PROCUREMENT_MANAGER,
    RoleType.PURCHASE_OFFICER,
  )
  @Post('purchase-orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel a Purchase Order' })
  cancelPo(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.cancelPo(id);
  }

  // ── Goods Receipt Notes ───────────────────────────────────────────────────

  @Get('grns')
  @ApiOperation({ summary: 'List Goods Receipt Notes' })
  getGrns() {
    return this.warehouseService.getGrns();
  }

  @Get('grns/:id')
  @ApiOperation({ summary: 'Get single GRN with items + PO info' })
  getGrnById(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getGrnById(id);
  }

  @Get('purchase-orders/:id/grns')
  @ApiOperation({ summary: 'List GRNs for a specific PO' })
  getGrnsByPoId(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getGrnsByPoId(id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.WAREHOUSE_MANAGER,
    RoleType.GOODS_RECEIVING_OFFICER,
  )
  @Post('purchase-orders/:id/create-grn')
  @ApiOperation({
    summary: 'Create GRN skeleton from SUPPLIER_CONFIRMED PO — items at qty=0, PO → RECEIVING',
  })
  createPoGrn(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.createGrnSkeleton(req.user.id, id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.WAREHOUSE_MANAGER,
    RoleType.GOODS_RECEIVING_OFFICER,
  )
  @Post('grns/:id/approve')
  @ApiOperation({
    summary:
      'Approve PENDING_RECEIPT GRN — enter quantities, remarks, update inventory, GRN → COMPLETED, auto-generate invoice',
  })
  approveGrn(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      items: {
        ingredientId: number;
        quantityReceived: number;
        quantityRejected?: number;
        damagedQuantity?: number;
        rejectionReason?: string;
        damageReason?: string;
        remarks?: string;
      }[];
    },
    @Req() req: any,
  ) {
    return this.warehouseService.approveGrn(req.user.id, id, body.items);
  }

  @Get('grns/:id/invoice')
  @ApiOperation({ summary: 'Get GRN invoice details for COMPLETED GRNs' })
  getGrnInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.warehouseService.getGrnInvoice(id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.WAREHOUSE_MANAGER,
    RoleType.GOODS_RECEIVING_OFFICER,
  )
  @Post('purchase-orders/:id/receive')
  @ApiOperation({ summary: 'Alias for create-grn skeleton (legacy, prefer create-grn)' })
  receivePoGoods(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.createGrnSkeleton(req.user.id, id);
  }

  @Roles(
    RoleType.SUPER_ADMIN,
    RoleType.INVENTORY_MANAGER,
    RoleType.WAREHOUSE_MANAGER,
    RoleType.GOODS_RECEIVING_OFFICER,
  )
  @Post('grns')
  @ApiOperation({ summary: 'Create GRN (legacy endpoint, prefer purchase-orders/:id/create-grn)' })
  createGrn(@Body() dto: CreateGrnDto, @Req() req: any) {
    return this.warehouseService.createGrn(req.user.id, dto);
  }

  // ── Store Requests ────────────────────────────────────────────────────────

  @Get('store-requests')
  @ApiOperation({ summary: 'List all branch store requests (full history across all statuses)' })
  getStoreRequests() {
    return this.warehouseService.getStoreRequests();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Post('store-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a branch store request and create warehouse transfer' })
  approveStoreRequest(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.approveStoreRequest(id, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Post('store-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a pending branch store request' })
  rejectStoreRequest(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.rejectStoreRequest(id, req.user.id);
  }

  // ── Outbound Transfers ────────────────────────────────────────────────────

  @Get('outbound-transfers')
  @ApiOperation({ summary: 'List warehouse-to-restaurant transfers' })
  getOutboundTransfers() {
    return this.warehouseService.getOutboundTransfers();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Post('outbound-transfers')
  @ApiOperation({ summary: 'Create outbound transfer to restaurant' })
  createOutboundTransfer(
    @Body()
    dto: {
      restaurantId: number;
      items: { ingredientId: number; quantity: number }[];
      notes?: string;
    },
    @Req() req: any,
  ) {
    return this.warehouseService.createOutboundTransfer(req.user.id, dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Post('outbound-transfers/:id/approve')
  @ApiOperation({ summary: 'Approve an outbound transfer' })
  approveOutboundTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.approveOutboundTransfer(id, req.user.id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Post('outbound-transfers/:id/dispatch')
  @ApiOperation({ summary: 'Dispatch approved transfer: deduct warehouse, increase store' })
  dispatchOutboundTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.warehouseService.dispatchOutboundTransfer(id, req.user.id);
  }

  // ── Stock Adjustment ──────────────────────────────────────────────────────

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post('adjust')
  @ApiOperation({ summary: 'Manually adjust warehouse inventory (SUPER_ADMIN only recommended)' })
  adjustStock(
    @Body() dto: { ingredientId: number; newQuantity: number; reason: string },
    @Req() req: any,
  ) {
    return this.warehouseService.adjustStock(req.user.id, dto);
  }

  // ── Reports ───────────────────────────────────────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'Warehouse reports: valuation, ledger, low stock' })
  getReports(@Query('warehouseId') warehouseId?: string) {
    return this.warehouseService.getReports(warehouseId ? Number(warehouseId) : undefined);
  }

  // ── Warehouse CRUD ────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  getWarehouses() {
    return this.warehouseService.getWarehouses();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create a new warehouse' })
  createWarehouse(@Body() dto: { name: string; location: string }) {
    return this.warehouseService.createWarehouse(dto.name, dto.location);
  }
}
