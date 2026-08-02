import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './database/data-source';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssetModule } from './modules/asset/asset.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { RequestModule } from './modules/request/request.module';
import { ServiceModule } from './modules/service/service.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    AssetModule,
    ServiceModule,
    RequestModule,
    AuthModule,
    AnalyticsModule,
    NotificationModule,
    AdminModule,
    AiModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
