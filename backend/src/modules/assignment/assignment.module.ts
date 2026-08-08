import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetEntity } from '../asset/asset.entity';
import { AuditModule } from '../audit/audit.module';
import { UserEntity } from '../auth/user.entity';
import { MailerModule } from '../mailer/mailer.module';
import { ServiceEntity } from '../service/service.entity';
import { AssignmentController } from './assignment.controller';
import { AssignmentEntity } from './assignment.entity';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AssignmentEntity,
      AssetEntity,
      UserEntity,
      ServiceEntity,
    ]),
    AuditModule,
    MailerModule,
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}
