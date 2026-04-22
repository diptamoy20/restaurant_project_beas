import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('orders')
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.ADMIN, Role.MANAGER)
  @Get()
  @ApiOperation({ summary: 'List recent orders' })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  listOrders(@Query() query: ListOrdersQueryDto): Promise<OrderResponseDto[]> {
    return this.ordersService.listOrders(query.limit);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  getOrder(@Param('id', ParseIntPipe) id: number): Promise<OrderResponseDto> {
    return this.ordersService.getOrder(id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  createOrder(
    @Body() payload: CreateOrderDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<OrderResponseDto> {
    const normalizedPayload = request.user.roles.includes(Role.CUSTOMER)
      ? { ...payload, userId: request.user.id }
      : payload;

    return this.ordersService.createOrder(normalizedPayload);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post('place-order')
  @ApiOperation({ summary: 'Create a new order (tracking alias)' })
  @ApiBody({ type: CreateOrderDto })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  placeOrder(
    @Body() payload: CreateOrderDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<OrderResponseDto> {
    const normalizedPayload = request.user.roles.includes(Role.CUSTOMER)
      ? { ...payload, userId: request.user.id }
      : payload;

    return this.ordersService.createOrder(normalizedPayload);
  }

  @Roles(Role.ADMIN, Role.MANAGER)
  @Post('update-order')
  @ApiOperation({ summary: 'Update an order status' })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateOrderStatus(@Body() payload: UpdateOrderStatusDto): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatus(payload.orderId, payload.status);
  }
}
