import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenRouterService } from './openrouter.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [PrismaModule, DashboardModule],
  controllers: [AiController],
  providers: [AiService, OpenRouterService],
})
export class AiModule {}
