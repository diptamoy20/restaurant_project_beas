import { Module } from '@nestjs/common';

import { DeliveriesController } from './deliveries.controller';
import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';
import { RoutingService } from '../../common/routing/routing.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AuthModule, NotificationsModule, PaymentsModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveriesGateway, RoutingService],
})
export class DeliveriesModule {}
