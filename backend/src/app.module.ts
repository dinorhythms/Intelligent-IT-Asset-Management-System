import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './database/data-source';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AssetModule } from './modules/asset/asset.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { AuditModule } from './modules/audit/audit.module';
import { CategoryModule } from './modules/category/category.module';
import { DepartmentModule } from './modules/department/department.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { QrCodeModule } from './modules/qrcode/qrcode.module';
import { RequestModule } from './modules/request/request.module';
import { ServiceModule } from './modules/service/service.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { VendorModule } from './modules/vendor/vendor.module';

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
    SettingsModule,
    AuditModule,
    UsersModule,
    AssignmentModule,
    QrCodeModule,
    CategoryModule,
    VendorModule,
    DepartmentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
