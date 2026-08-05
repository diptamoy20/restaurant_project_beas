import { Module } from '@nestjs/common';

import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { IntegrationModule } from '../integration/integration.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, IntegrationModule],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
