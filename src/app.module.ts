import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { StockModule } from './stock/stock.module';
import { AiModule } from './ai/ai.module';
import { SalesModule } from './sales/sales.module';

@Module({
  imports: [
    PrismaModule,
    ProductsModule,
    AuthModule,
    DashboardModule,
    StockModule,
    SalesModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
