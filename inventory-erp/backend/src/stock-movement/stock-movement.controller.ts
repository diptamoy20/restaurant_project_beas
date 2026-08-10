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

import { CreateStoreRequestDto, CreateTransferDto } from './dto/movement.dto';
import { StockMovementService } from './stock-movement.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Stock Movements (Transfers & Store Requests)')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('stock-movement')
export class StockMovementController {
  constructor(private readonly stockMovementService: StockMovementService) {}

  @Get('store/stock')
  @ApiOperation({ summary: 'Get Restaurant Store Room Inventory' })
  getStoreStock(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.stockMovementService.getStoreStock(restaurantId);
  }

  @Get('kitchen/stock')
  @ApiOperation({ summary: 'Get Restaurant Kitchen Operational Inventory' })
  getKitchenStock(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.stockMovementService.getKitchenStock(restaurantId);
  }

  @Get('transfers')
  @ApiOperation({ summary: 'List all Kitchen Transfers' })
  getKitchenTransfers(@Query('restaurantId') restaurantId?: number) {
    return this.stockMovementService.getKitchenTransfers(
      restaurantId ? Number(restaurantId) : undefined,
    );
  }

  @Post('transfers')
  @ApiOperation({ summary: 'Request stock transfer from Store Room to Kitchen' })
  createKitchenTransfer(@Body() dto: CreateTransferDto, @Req() req: any) {
    return this.stockMovementService.createKitchenTransfer(req.user.id, dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.STORE_MANAGER)
  @Put('transfers/:id/approve')
  @ApiOperation({ summary: 'Approve & Issue stock transfer to Kitchen' })
  approveKitchenTransfer(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.stockMovementService.approveKitchenTransfer(id, req.user.id);
  }

  @Get('store-requests')
  @ApiOperation({ summary: 'List all Store Requests (Restaurant → Warehouse)' })
  getStoreRequests(@Query('restaurantId') restaurantId?: number) {
    return this.stockMovementService.getStoreRequests(
      restaurantId ? Number(restaurantId) : undefined,
    );
  }

  @Post('store-requests')
  @ApiOperation({ summary: 'Create a Store Request for warehouse stock' })
  createStoreRequest(@Body() dto: CreateStoreRequestDto, @Req() req: any) {
    return this.stockMovementService.createStoreRequest(req.user.id, dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.WAREHOUSE_MANAGER)
  @Put('store-requests/:id/fulfill')
  @ApiOperation({ summary: 'Fulfill a Store Request using warehouse stock' })
  fulfillStoreRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body('warehouseId', ParseIntPipe) warehouseId: number,
    @Req() req: any,
  ) {
    return this.stockMovementService.fulfillStoreRequest(id, warehouseId, req.user.id);
  }
}
