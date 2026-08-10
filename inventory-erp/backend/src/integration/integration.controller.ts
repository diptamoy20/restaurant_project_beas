import { Body, Controller, Get, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { IntegrationService } from './integration.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Restaurant Backend Integration API')
@Controller('integration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @Get('restaurants')
  @ApiOperation({ summary: 'List restaurants with inventory metrics from RMS + ERP' })
  getRestaurants() {
    return this.integrationService.getRestaurants();
  }

  @Get('kitchen-inventory')
  @ApiOperation({ summary: 'Get read-only kitchen inventory for a restaurant' })
  getKitchenStock(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.integrationService.getKitchenStock(restaurantId);
  }

  @Get('kitchen-requests')
  @ApiOperation({ summary: 'List kitchen requests for a restaurant' })
  getKitchenRequests(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.integrationService.getKitchenRequests(restaurantId);
  }

  @Post('kitchen-requests')
  @ApiOperation({ summary: 'Create a kitchen request from RMS (kitchen → store)' })
  createKitchenRequest(
    @Body()
    dto: {
      restaurantId: number;
      requestedById: number;
      notes?: string;
      items: Array<{ ingredientId: number; quantity: number }>;
    },
  ) {
    return this.integrationService.createKitchenRequest(dto);
  }

  @Get('kitchen-transfers')
  @ApiOperation({ summary: 'List kitchen transfers for a restaurant' })
  getKitchenTransfers(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.integrationService.getKitchenTransfers(restaurantId);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Check ingredient availability for a menu item portion' })
  checkAvailability(
    @Query('restaurantId', ParseIntPipe) restaurantId: number,
    @Query('menuItemId', ParseIntPipe) menuItemId: number,
    @Query('quantity', ParseIntPipe) quantity: number,
  ) {
    return this.integrationService.checkAvailability(restaurantId, menuItemId, quantity);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get inventory dashboard metrics for a restaurant' })
  getDashboard(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.integrationService.getDashboard(restaurantId);
  }

  @Get('consumption')
  @ApiOperation({ summary: 'Get kitchen consumption history for a restaurant' })
  getConsumption(@Query('restaurantId', ParseIntPipe) restaurantId: number) {
    return this.integrationService.getConsumption(restaurantId);
  }

  @Post('consume-recipe')
  @ApiOperation({ summary: 'Deduct ingredients on order preparation (status PREPARING)' })
  consumeRecipe(
    @Body()
    dto: {
      restaurantId: number;
      orderId: string;
      orderItems: Array<{ menuItemId: number; quantity: number }>;
    },
  ) {
    return this.integrationService.consumeRecipe(dto);
  }
}
