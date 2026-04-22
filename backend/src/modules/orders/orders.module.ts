import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { OrdersRealtimeService } from './orders-realtime.service';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRealtimeService],
  exports: [OrdersRealtimeService],
})
export class OrdersModule {}
