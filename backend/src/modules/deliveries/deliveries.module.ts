import { Module, forwardRef } from '@nestjs/common';

import { DeliveriesController } from './deliveries.controller';
import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';
import { RoutingService } from '../../common/routing/routing.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [AuthModule, NotificationsModule, PaymentsModule, forwardRef(() => OrdersModule)],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveriesGateway, RoutingService],
  exports: [DeliveriesGateway, DeliveriesService],
})
export class DeliveriesModule {}
