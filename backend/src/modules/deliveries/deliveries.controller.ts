import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { DeliveriesService } from './deliveries.service';
import {
  DeliveryBoyDashboardDto,
  DeliveryBoyOrderDetailsDto,
  DeliveryBoyOrdersQueryDto,
  DeliveryBoyProfileDto,
  DeliveryLocationUpdateResponseDto,
  DeliveryTrackingResponseDto,
  PaginatedDeliveryBoyOrderCardsDto,
  UpdateDeliveryAvailabilityDto,
  UpdateDeliveryLocationDto,
  UpdateDeliveryStatusDto,
  UpdateMyDeliveryLocationDto,
} from './dto';
import { DELIVERY_STATUS } from '../../common/constants/delivery-status';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('deliveries')
@ApiTags('Deliveries')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

  @Roles(Role.DELIVERY_BOY)
  @Get('me/dashboard')
  @ApiOperation({ summary: 'Get delivery-boy dashboard summary' })
  @ApiOkResponse({ type: DeliveryBoyDashboardDto })
  @ApiStandardErrorResponses({ notFound: true })
  getMyDashboard(@Req() request: { user: AuthenticatedUser }): Promise<DeliveryBoyDashboardDto> {
    return this.deliveriesService.getDashboard(request.user);
  }

  @Roles(Role.DELIVERY_BOY)
  @Get('me/orders')
  @ApiOperation({ summary: 'List orders assigned to current delivery boy' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [DELIVERY_STATUS.ASSIGNED, DELIVERY_STATUS.ON_THE_WAY, DELIVERY_STATUS.DELIVERED],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedDeliveryBoyOrderCardsDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  listMyOrders(
    @Req() request: { user: AuthenticatedUser },
    @Query() query: DeliveryBoyOrdersQueryDto,
  ): Promise<PaginatedDeliveryBoyOrderCardsDto> {
    return this.deliveriesService.listMyOrders(request.user, query);
  }

  @Roles(Role.DELIVERY_BOY)
  @Get('me/orders/:orderId')
  @ApiOperation({ summary: 'Get delivery-boy order details for mobile app' })
  @ApiParam({ name: 'orderId', type: Number, example: 1025 })
  @ApiOkResponse({ type: DeliveryBoyOrderDetailsDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  getMyOrderDetails(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryBoyOrderDetailsDto> {
    return this.deliveriesService.getMyOrderDetails(request.user, orderId);
  }

  @Roles(Role.DELIVERY_BOY)
  @Patch('me/availability')
  @ApiOperation({ summary: 'Update current delivery-boy availability' })
  @ApiBody({ type: UpdateDeliveryAvailabilityDto })
  @ApiOkResponse({ type: DeliveryBoyProfileDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateMyAvailability(
    @Body() payload: UpdateDeliveryAvailabilityDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryBoyProfileDto> {
    return this.deliveriesService.updateAvailability(request.user, payload.isAvailable);
  }

  @Roles(Role.DELIVERY_BOY)
  @Patch('me/orders/:orderId/accept')
  @ApiOperation({ summary: 'Accept assigned order as current delivery boy' })
  @ApiParam({ name: 'orderId', type: Number, example: 1025 })
  @ApiOkResponse({ type: DeliveryBoyOrderDetailsDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  acceptMyOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryBoyOrderDetailsDto> {
    return this.deliveriesService.acceptMyOrder(request.user, orderId);
  }

  @Roles(Role.DELIVERY_BOY)
  @Patch('me/orders/:orderId/status')
  @ApiOperation({ summary: 'Update assigned delivery order status' })
  @ApiParam({ name: 'orderId', type: Number, example: 1025 })
  @ApiBody({ type: UpdateDeliveryStatusDto })
  @ApiOkResponse({ type: DeliveryBoyOrderDetailsDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateMyOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() payload: UpdateDeliveryStatusDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryBoyOrderDetailsDto> {
    return this.deliveriesService.updateMyOrderStatus(request.user, orderId, payload.status);
  }

  @Roles(Role.DELIVERY_BOY)
  @Post('me/location')
  @ApiOperation({ summary: 'Update current delivery-boy location by assigned order id' })
  @ApiBody({ type: UpdateMyDeliveryLocationDto })
  @ApiOkResponse({ type: DeliveryLocationUpdateResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateMyLocation(
    @Body() payload: UpdateMyDeliveryLocationDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryLocationUpdateResponseDto> {
    return this.deliveriesService.updateMyLocation(request.user, payload);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.DELIVERY_BOY)
  @Post('location')
  @ApiOperation({
    summary:
      'Update delivery location by delivery id. Delivery-boy role is ownership-checked; mobile apps should use /deliveries/me/location.',
  })
  @ApiBody({ type: UpdateDeliveryLocationDto })
  @ApiOkResponse({ type: DeliveryLocationUpdateResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateDeliveryLocation(
    @Body() payload: UpdateDeliveryLocationDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryLocationUpdateResponseDto> {
    return this.deliveriesService.updateDeliveryLocation(payload, request.user);
  }

  @Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
  @Get('order/:orderId/track')
  @ApiOperation({ summary: 'Track delivery by order id' })
  @ApiParam({ name: 'orderId', type: Number, example: 1 })
  @ApiOkResponse({ type: DeliveryTrackingResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  getTracking(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<DeliveryTrackingResponseDto> {
    return this.deliveriesService.getTrackingByOrder(orderId, request.user);
  }
}
