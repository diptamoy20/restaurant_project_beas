import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrderSource } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto, PaginatedOrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('orders')
@ApiTags('Orders')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.CUSTOMER)
  @Get('my-orders')
  @ApiOperation({ summary: 'List orders for the authenticated customer' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedOrderResponseDto })
  listMyOrders(
    @Req() request: { user: AuthenticatedUser },
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    return this.ordersService.listMyOrders(request.user.id, query);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  getOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrder(id, request.user);
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
      ? { ...payload, userId: request.user.id, source: payload.source || OrderSource.WEBSITE }
      : { ...payload, source: payload.source || OrderSource.ADMIN };

    return this.ordersService.createOrder(normalizedPayload);
  }
}
