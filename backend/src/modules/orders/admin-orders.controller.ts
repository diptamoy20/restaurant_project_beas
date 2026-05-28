import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { AssignDeliveryAgentDto } from './dto/assign-delivery-agent.dto';
import { OrderResponseDto, PaginatedOrderResponseDto } from './dto/order-response.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('admin/orders')
@ApiTags('Admin Orders')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for admin with filters and search' })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['recent', 'last_1_hour', 'last_3_hours'] })
  @ApiQuery({ name: 'type', required: false, enum: ['DINE_IN', 'DELIVERY'] })
  @ApiQuery({ name: 'payment', required: false, enum: ['CASH', 'UPI', 'CARD'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PREPARING', 'ON_THE_WAY', 'DELIVERED', 'CANCELLED', 'SERVED'],
  })
  @ApiQuery({ name: 'action', required: false, enum: ['ACCEPT', 'REJECT'] })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiOkResponse({ type: PaginatedOrderResponseDto })
  listOrders(@Query() query: AdminOrderQueryDto): Promise<PaginatedResult<OrderResponseDto>> {
    return this.ordersService.listOrdersForAdmin(query);
  }

  @Get('delivery-agents')
  @ApiOperation({ summary: 'List delivery agents available for order assignment' })
  @ApiQuery({ name: 'availableOnly', required: false, type: Boolean })
  @ApiOkResponse({
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          name: { type: 'string', example: 'Ravi Kumar' },
          phone: { type: 'string', example: '+919900000005' },
          isAvailable: { type: 'boolean', example: true },
        },
      },
    },
  })
  listDeliveryAgents(
    @Query('availableOnly') availableOnly?: boolean,
  ): Promise<Array<{ id: number; name: string; phone: string; isAvailable: boolean }>> {
    return this.ordersService.listDeliveryAgents({ availableOnly: availableOnly === true });
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept order (sets ACCEPTED + acceptedAt)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  acceptOrder(@Param('id', ParseIntPipe) id: number): Promise<OrderResponseDto> {
    return this.ordersService.acceptOrderByAdmin(id);
  }

  @Patch(':id/delivery')
  @ApiOperation({ summary: 'Assign a delivery order to a delivery boy' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: AssignDeliveryAgentDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  assignDeliveryAgent(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AssignDeliveryAgentDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.assignDeliveryAgentByAdmin(id, body.agentId);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update fulfilment status' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateOrderStatusDto })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrderStatusDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatusByAdmin(id, body.status, {
      cancellationReason: body.cancellationReason,
      changedByUserId: request.user.id,
    });
  }
}
