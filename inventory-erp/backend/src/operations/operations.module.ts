import { Module } from '@nestjs/common';

import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { IntegrationModule } from '../integration/integration.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, IntegrationModule],
  controllers: [OperationsController],
  providers: [OperationsService],
})
export class OperationsModule {}
