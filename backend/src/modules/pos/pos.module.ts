import { Module } from '@nestjs/common';

import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PosService],
  controllers: [PosController],
})
export class PosModule {}
