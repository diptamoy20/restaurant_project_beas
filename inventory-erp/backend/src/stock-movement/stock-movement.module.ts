import { Module } from '@nestjs/common';

import { StockMovementController } from './stock-movement.controller';
import { StockMovementService } from './stock-movement.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StockMovementController],
  providers: [StockMovementService],
  exports: [StockMovementService],
})
export class StockMovementModule {}
