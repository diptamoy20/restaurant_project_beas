import { Module, forwardRef } from '@nestjs/common';

import { AdminOrdersController } from './admin-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { BillingModule } from '../billing/billing.module';
import { DeliveriesModule } from '../deliveries/deliveries.module';

@Module({
  imports: [BillingModule, forwardRef(() => DeliveriesModule)],

  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
