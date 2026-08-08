import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AssignmentEntity } from '../assignment/assignment.entity';
import { AuditModule } from '../audit/audit.module';
import { MailerModule } from '../mailer/mailer.module';
import { ServiceEntity } from '../service/service.entity';
import { SettingsModule } from '../settings/settings.module';
import { AssetController } from './asset.controller';
import { AssetEntity } from './asset.entity';
import { AssetService } from './asset.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssetEntity,
      PredictiveResultEntity,
      AssignmentEntity,
      ServiceEntity,
    ]),
    AiModule,
    SettingsModule,
    AuditModule,
    MailerModule,
  ],
  controllers: [AssetController],
  providers: [AssetService],
  exports: [AssetService],
})
export class AssetModule {}
