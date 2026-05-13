import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { QRMenuResponseDto } from './dto/qr-menu-response.dto';
import { QRCreateOrderDto } from './dto/qr-create-order.dto';
import { QRCreateOrderResponseDto } from './dto/qr-create-order-response.dto';

@ApiTags('QR Ordering')
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('menu/:restaurantId/:tableId')
  @ApiOperation({
    summary: 'Get menu for QR ordering',
    description: 'Retrieves the menu for a specific restaurant and table for QR-based ordering',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'Restaurant ID',
    type: Number,
  })
  @ApiParam({
    name: 'tableId',
    description: 'Table ID',
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description: 'Menu retrieved successfully',
    type: QRMenuResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurant or table not found',
  })
  async getMenu(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<QRMenuResponseDto> {
    return this.qrService.getMenuForTable(restaurantId, tableId);
  }

  @Post('order')
  @ApiOperation({
    summary: 'Create QR order',
    description: 'Creates a new order through QR scanning for dine-in customers',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: QRCreateOrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurant or table not found',
  })
  async createOrder(@Body() orderData: QRCreateOrderDto): Promise<QRCreateOrderResponseDto> {
    return this.qrService.createQrOrder(orderData);
  }
}