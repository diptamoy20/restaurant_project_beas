import { Module } from '@nestjs/common';

import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { CouponsModule } from '../coupons/coupons.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, OrdersModule, CouponsModule],
  providers: [PosService],
  controllers: [PosController],
})
export class PosModule {}
