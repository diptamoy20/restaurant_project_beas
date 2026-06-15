import { Module } from '@nestjs/common';

import { BillingService } from './billing.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [PrismaModule, LocationModule],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
