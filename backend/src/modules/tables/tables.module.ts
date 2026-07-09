import { Module } from '@nestjs/common';

import { AdminTableSessionsController, AdminTablesController } from './admin-tables.controller';
import { QrCodeService } from './qr-code.service';
import { TableResolutionController } from './table-resolution.controller';
import { TableSessionsService } from './table-sessions.service';
import { TablesService } from './tables.service';

@Module({
  controllers: [AdminTablesController, AdminTableSessionsController, TableResolutionController],
  providers: [TablesService, TableSessionsService, QrCodeService],
  exports: [TablesService, TableSessionsService, QrCodeService],
})
export class TablesModule {}
