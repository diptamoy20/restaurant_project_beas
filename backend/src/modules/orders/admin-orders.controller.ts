import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('admin/orders')
@ApiTags('Admin Orders')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept order (sets ACCEPTED + acceptedAt)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  acceptOrder(@Param('id', ParseIntPipe) id: number): Promise<OrderResponseDto> {
    return this.ordersService.acceptOrderByAdmin(id);
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
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateOrderStatusByAdmin(id, body.status);
  }
}
