import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { DeliveriesService } from './deliveries.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY)
  @Post('location')
  updateLocation(@Body() payload: UpdateDeliveryLocationDto) {
    return this.deliveriesService.updateDeliveryLocation(payload);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
  @Get('order/:orderId/track')
  getTracking(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.deliveriesService.getTrackingByOrder(orderId);
  }
}
