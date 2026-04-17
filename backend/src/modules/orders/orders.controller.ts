import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
  @Get(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOrder(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.ordersService.getOrder(id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post()
  /* eslint-disable @typescript-eslint/no-explicit-any */
  createOrder(
    @Body() payload: CreateOrderDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<any> {
    const normalizedPayload = request.user.roles.includes(Role.CUSTOMER)
      ? { ...payload, userId: request.user.id }
      : payload;

    return this.ordersService.createOrder(normalizedPayload);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
