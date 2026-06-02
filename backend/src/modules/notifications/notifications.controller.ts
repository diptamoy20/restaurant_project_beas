import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  DeviceTokenResponseDto,
  RegisterDeviceTokenDto,
  UnregisterDeviceTokenDto,
} from './dto/device-token.dto';
import {
  NotificationResponseDto,
  PaginatedNotificationResponseDto,
} from './dto/notification-response.dto';
import { NotificationService } from './notification.service';
import { NotificationsService } from './notifications.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult, PaginationQueryDto } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('notifications')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('device-tokens')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Register the current customer device FCM token' })
  @ApiCreatedResponse({ type: DeviceTokenResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  registerDeviceToken(
    @Req() request: { user: AuthenticatedUser },
    @Body() payload: RegisterDeviceTokenDto,
  ): Promise<DeviceTokenResponseDto> {
    return this.notificationService.registerDeviceToken(
      request.user.id,
      payload.token,
      payload.platform,
    );
  }

  @Delete('device-tokens')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Unregister the current customer device FCM token' })
  @ApiOkResponse({ type: DeviceTokenResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  unregisterDeviceToken(
    @Req() request: { user: AuthenticatedUser },
    @Body() payload: UnregisterDeviceTokenDto,
  ): Promise<DeviceTokenResponseDto> {
    return this.notificationService.unregisterDeviceToken(request.user.id, payload.token);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiParam({ name: 'userId', type: Number, example: 3 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedNotificationResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async getNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: { user: AuthenticatedUser },
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<NotificationResponseDto>> {
    return this.notificationsService.getNotifications(userId, request.user, query);
  }
}
