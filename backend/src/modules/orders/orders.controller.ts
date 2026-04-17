import { Body, Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
  @Get(':id')
  getOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getOrder(id);
  }

  @Roles(Role.ADMIN, Role.CUSTOMER)
  @Post()
  createOrder(
    @Body() payload: CreateOrderDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    const normalizedPayload =
      request.user.roles.includes(Role.CUSTOMER)
        ? { ...payload, userId: request.user.id }
        : payload;

    return this.ordersService.createOrder(normalizedPayload);
  }
}
