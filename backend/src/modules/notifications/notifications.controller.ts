import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsService } from './notifications.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('notifications')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiParam({ name: 'userId', type: Number, example: 3 })
  @ApiOkResponse({ type: NotificationResponseDto, isArray: true })
  @ApiStandardErrorResponses({ badRequest: true })
  async getNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<NotificationResponseDto[]> {
    return this.notificationsService.getNotifications(userId, request.user);
  }
}
