import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { QRCreateOrderResponseDto } from './dto/qr-create-order-response.dto';
import { QRCreateOrderDto } from './dto/qr-create-order.dto';
import { QRMenuResponseDto } from './dto/qr-menu-response.dto';
import { QrService } from './qr.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('QR Ordering')
@ApiExtraModels(QRCreateOrderDto)
@Controller('qr')
@ApiStandardErrorResponses({ badRequest: true, notFound: true })
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('menu/:restaurantId/:tableId')
  @Public()
  @ApiOperation({
    summary: 'Get QR menu',
    description: 'Seed test: restaurantId=1, tableId=1.',
  })
  @ApiParam({
    name: 'restaurantId',
    description: 'Restaurant ID',
    example: 1,
    type: Number,
  })
  @ApiParam({
    name: 'tableId',
    description: 'Table ID',
    example: 1,
    type: Number,
  })
  @ApiOkResponse({
    status: 200,
    description: 'Menu retrieved successfully',
    type: QRMenuResponseDto,
  })
  async getMenu(
    @Param('restaurantId', ParseIntPipe) restaurantId: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<QRMenuResponseDto> {
    return this.qrService.getMenuForTable(restaurantId, tableId);
  }

  @Post('order')
  @Public()
  @ApiOperation({
    summary: 'Create guest QR order',
    description: 'Seed test: restaurantId=1, tableId=1, menuItemId=1, variantId=2.',
  })
  @ApiBody({
    type: QRCreateOrderDto,
    description: 'Guest QR order request.',
    examples: {
      paneerBurgerLarge: {
        summary: 'Paneer Burger Large',
        value: {
          restaurantId: 1,
          tableId: 1,
          items: [
            {
              menuItemId: 1,
              variantId: 2,
              quantity: 2,
            },
          ],
          paymentMethod: 'COD',
        },
      },
      crispyCorn: {
        summary: 'Crispy Corn',
        value: {
          restaurantId: 1,
          tableId: 1,
          items: [
            {
              menuItemId: 2,
              quantity: 1,
            },
          ],
          paymentMethod: 'COD',
        },
      },
    },
  })
  @ApiCreatedResponse({
    status: 201,
    description: 'QR order created successfully',
    type: QRCreateOrderResponseDto,
  })
  async createOrder(@Body() orderData: QRCreateOrderDto): Promise<QRCreateOrderResponseDto> {
    return this.qrService.createQrOrder(orderData);
  }
}
