import { Global, Module } from '@nestjs/common';

import { GeoCacheService } from './geo-cache.service';

@Global()
@Module({
  providers: [GeoCacheService],
  exports: [GeoCacheService],
})
export class GeoCacheModule {}
