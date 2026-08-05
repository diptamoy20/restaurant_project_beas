import { Module, forwardRef } from '@nestjs/common';

import { InventoryIntegrationService } from './inventory-integration.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PrismaModule, forwardRef(() => OrdersModule)],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryIntegrationService],
  exports: [InventoryService, InventoryIntegrationService],
})
export class InventoryModule {}
