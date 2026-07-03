import { Module } from '@nestjs/common';

import { AddressController } from './address.controller';
import { LocationService } from './location.service';
import { RoutingService } from '../../common/routing/routing.service';

@Module({
  controllers: [AddressController],
  providers: [LocationService, RoutingService],
  exports: [LocationService],
})
export class LocationModule {}
