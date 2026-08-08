import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AssetEntity } from '../asset/asset.entity';
import { AssignmentEntity } from '../assignment/assignment.entity';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AuditModule } from '../audit/audit.module';
import { UserEntity } from '../auth/user.entity';
import { MailerModule } from '../mailer/mailer.module';
import { ServiceController } from './service.controller';
import { ServiceEntity } from './service.entity';
import { ServiceService } from './service.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceEntity,
      AssetEntity,
      AssignmentEntity,
      PredictiveResultEntity,
      UserEntity,
    ]),
    AiModule,
    AuditModule,
    MailerModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}
