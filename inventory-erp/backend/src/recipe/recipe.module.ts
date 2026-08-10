import { Module } from '@nestjs/common';

import { RecipeController } from './recipe.controller';
import { RecipeService } from './recipe.service';
import { IntegrationModule } from '../integration/integration.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, IntegrationModule],
  controllers: [RecipeController],
  providers: [RecipeService],
  exports: [RecipeService],
})
export class RecipeModule {}
