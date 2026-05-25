import { Module } from '@nestjs/common';

import { CheckoutController } from './checkout.controller';
import { BillingModule } from '../billing/billing.module';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [BillingModule, CouponsModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
