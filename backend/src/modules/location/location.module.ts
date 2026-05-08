import { Module } from '@nestjs/common';

import { AddressController } from './address.controller';
import { LocationService } from './location.service';

@Module({
  controllers: [AddressController],
  providers: [LocationService],
  exports: [LocationService],
})
export class LocationModule {}
