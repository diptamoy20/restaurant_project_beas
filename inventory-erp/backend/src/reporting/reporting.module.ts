import { Module } from '@nestjs/common';

import { ReportingController } from './reporting.controller';
import { ReportingService } from './reporting.service';
import { IntegrationModule } from '../integration/integration.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, IntegrationModule],
  controllers: [ReportingController],
  providers: [ReportingService],
  exports: [ReportingService],
})
export class ReportingModule {}
