import { Module } from '@nestjs/common';

import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [NotificationsModule, PaymentsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService],
})
export class DeliveriesModule {}
