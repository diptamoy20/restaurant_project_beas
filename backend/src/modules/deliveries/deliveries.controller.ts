import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';

import { DeliveriesService } from './deliveries.service';
import {
  UpdateDeliveryLocationDto,
  DeliveryLocationUpdateResponseDto,
  DeliveryTrackingResponseDto,
} from './dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY)
  @Post('location')
  async updateDeliveryLocation(
    @Body() payload: UpdateDeliveryLocationDto,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    return this.deliveriesService.updateDeliveryLocation(payload);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
  @Get('order/:orderId/track')
  async getTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<DeliveryTrackingResponseDto> {
    return this.deliveriesService.getTrackingByOrder(orderId);
  }
}
