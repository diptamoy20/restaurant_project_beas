import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryType } from '@prisma/client';

import { KitchenDisplayOrderDto } from '../orders/dto/kitchen-display.dto';
import { OrdersService } from '../orders/orders.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { CreateKitchenTransferDto } from './dto/create-kitchen-transfer.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { CreateRequisitionDto } from './dto/create-requisition.dto';
import { InventoryIntegrationService } from './inventory-integration.service';
import { InventoryService } from './inventory.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrepareBomDto } from './dto/prepare-bom.dto';
@Controller('inventory')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiTags('Inventory Management')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly integrationService: InventoryIntegrationService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('kitchen-display')
  @ApiOperation({ summary: 'List active kitchen display (KDS) orders for a restaurant' })
  @ApiOkResponse({ type: KitchenDisplayOrderDto, isArray: true })
  listKitchenDisplayOrders(@Query('restaurantId') restaurantId?: number) {
    if (restaurantId) {
      return this.ordersService.getKitchenDisplayOrders(Number(restaurantId));
    }
    return [];
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get ERP Inventory Dashboard analytics and summary metrics' })
  async getDashboard(@Query('restaurantId') restaurantId?: number) {
    if (restaurantId) {
      return this.integrationService.getDashboard(Number(restaurantId));
    }
    return this.inventoryService.getDashboard();
  }

  @Get('store')
  @ApiOperation({ summary: 'List Store Inventory items, stock levels, and status' })
  async listStoreInventory(
    @Query('restaurantId') restaurantId?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.listStoreInventory(
      restaurantId ? Number(restaurantId) : undefined,
      { search, category, status },
    );
  }
  @Get('kitchen')
  @ApiOperation({ summary: 'List Kitchen Operational Inventory items and stock levels' })
  async listKitchenInventory(
    @Query('restaurantId') restaurantId?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.inventoryService.listKitchenInventory(
      restaurantId ? Number(restaurantId) : undefined,
      { search, status },
    );
  }
  @Post('items')
  @HttpCode(201)
  @ApiOperation({
    summary: 'Create new inventory ingredient item and initialize store/kitchen balances',
  })
  createInventoryItem(
    @Body() dto: CreateInventoryItemDto,
    @Query('restaurantId') restaurantId?: number,
  ) {
    return this.inventoryService.createInventoryItem(
      restaurantId ? Number(restaurantId) : undefined,
      dto,
    );
  }

  @Get('recipes')
  @ApiOperation({ summary: 'List Bill of Materials (Recipes) for menu items' })
  listRecipes(@Query('restaurantId') restaurantId?: number) {
    return this.inventoryService.listRecipes(restaurantId ? Number(restaurantId) : undefined);
  }

  @Post('recipes')
  @ApiOperation({ summary: 'Create or update Recipe (BOM) for a menu item' })
  createOrUpdateRecipe(@Body() dto: CreateRecipeDto, @Query('restaurantId') restaurantId?: number) {
    return this.inventoryService.createOrUpdateRecipe(
      restaurantId ? Number(restaurantId) : undefined,
      dto,
    );
  }
  @Post('recipes/preparation-plan')
  @ApiOperation({
    summary: 'Calculate BOM requirements for planned preparation',
  })
  async planPreparation(
    @Body() dto: PrepareBomDto,
    @Query('restaurantId', ParseIntPipe) restaurantId: number,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.inventoryService.planPreparation(
      restaurantId,
      req.user.id,
      dto.items,
    );
  }

  @Get('transfers')
  @ApiOperation({ summary: 'List Kitchen Requests (from ERP — the single source of truth)' })
  async listKitchenTransfers(@Query('restaurantId') restaurantId?: number) {
    if (restaurantId) {
      return this.integrationService.getKitchenRequests(Number(restaurantId));
    }
    return [];
  }

  @Post('transfers')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create Kitchen Transfer (Store → Kitchen)' })
  async createKitchenTransfer(
    @Body() dto: CreateKitchenTransferDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    const restaurantId = dto.restaurantId;

    if (!restaurantId) {
      throw new Error('restaurantId is required');
    }

    return this.inventoryService.createKitchenTransfer(
      restaurantId,
      req.user.id,
      dto,
    );
  }

  @Post('transfers/:id/approve')
  @ApiOperation({
    summary: 'Approve & Issue Kitchen Stock Transfer (Store → Kitchen)',
  })
  async approveKitchenTransfer(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: { user: AuthenticatedUser },
  ) {
    return this.inventoryService.approveKitchenTransfer(
      id,
      req.user.id,
    );
  }

  @Get('consumption')
  @ApiOperation({ summary: 'List Kitchen Consumption Audit History Logs (from ERP)' })
  async listConsumptionHistory(@Query('restaurantId') restaurantId?: number) {
    if (restaurantId) {
      const data = await this.integrationService.getConsumption(Number(restaurantId));
      return data.map((c: any) => ({
        id: c.id,
        ingredientName: c.ingredient?.name,
        quantity: c.quantity,
        unit: c.unit,
        beforeQuantity: c.beforeQuantity,
        afterQuantity: c.afterQuantity,
        referenceId: c.referenceId,
        timestamp: c.timestamp,
      }));
    }
    return this.inventoryService.listConsumptionHistory(
      restaurantId ? Number(restaurantId) : undefined,
    );
  }

  @Get('ledger')
  @ApiOperation({ summary: 'List Inventory Transaction Ledgers' })
  listTransactionLedger(
    @Query('restaurantId') restaurantId?: number,
    @Query('inventoryType') inventoryType?: InventoryType,
  ) {
    return this.inventoryService.listTransactionLedger(
      restaurantId ? Number(restaurantId) : undefined,
      inventoryType,
    );
  }

  @Get('requisitions')
  @ApiOperation({ summary: 'List Store Requisitions (Store to Warehouse ERP)' })
  listRequisitions(@Query('restaurantId') restaurantId?: number) {
    return this.inventoryService.listRequisitions(restaurantId ? Number(restaurantId) : undefined);
  }

  @Post('requisitions')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create Store Requisition (Store to Warehouse ERP)' })
  createRequisition(
    @Body() dto: CreateRequisitionDto,
    @Req() req: { user: AuthenticatedUser },
    @Query('restaurantId') restaurantId?: number,
  ) {
    return this.inventoryService.createRequisition(
      restaurantId ? Number(restaurantId) : undefined,
      req.user.id,
      dto,
    );
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed sample inventory items, initial stock, and recipes for demo' })
  seedSampleInventoryData(@Query('restaurantId') restaurantId?: number) {
    return this.inventoryService.seedSampleInventoryData(
      restaurantId ? Number(restaurantId) : undefined,
    );
  }
}
