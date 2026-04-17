import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('notifications')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER, Role.DELIVERY_BOY)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user/:userId')
  getNotifications(@Param('userId', ParseIntPipe) userId: number) {
    return this.notificationsService.getNotifications(userId);
  }
}
