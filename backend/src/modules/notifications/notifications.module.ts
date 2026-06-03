import { Module } from '@nestjs/common';

import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
