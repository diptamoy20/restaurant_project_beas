import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { IntegrationModule } from './integration/integration.module';
import { MasterModule } from './master/master.module';
import { OperationsModule } from './operations/operations.module';
import { PrismaModule } from './prisma/prisma.module';
import { RecipeModule } from './recipe/recipe.module';
import { ReportingModule } from './reporting/reporting.module';
import { StockMovementModule } from './stock-movement/stock-movement.module';
import { SupplierModule } from './supplier/supplier.module';
import { UsersModule } from './users/users.module';
import { WarehouseModule } from './warehouse/warehouse.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    MasterModule,
    SupplierModule,
    IntegrationModule,
    WarehouseModule,
    OperationsModule,
    ReportingModule,
    RecipeModule,
    StockMovementModule,
  ],
})
export class AppModule {}
