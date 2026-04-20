import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { DeliveriesService } from './deliveries.service';
import {
  UpdateDeliveryLocationDto,
  DeliveryLocationUpdateResponseDto,
  DeliveryTrackingResponseDto,
} from './dto';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('deliveries')
@ApiTags('Deliveries')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Roles(Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY)
  @Post('location')
  @ApiOperation({ summary: 'Update delivery location' })
  @ApiBody({ type: UpdateDeliveryLocationDto })
  @ApiOkResponse({ type: DeliveryLocationUpdateResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async updateDeliveryLocation(
    @Body() payload: UpdateDeliveryLocationDto,
  ): Promise<DeliveryLocationUpdateResponseDto> {
    return this.deliveriesService.updateDeliveryLocation(payload);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
  @Get('order/:orderId/track')
  @ApiOperation({ summary: 'Track delivery by order id' })
  @ApiParam({ name: 'orderId', type: Number, example: 1 })
  @ApiOkResponse({ type: DeliveryTrackingResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<DeliveryTrackingResponseDto> {
    return this.deliveriesService.getTrackingByOrder(orderId);
  }
}
