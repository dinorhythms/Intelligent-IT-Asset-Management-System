import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditLogEntity } from './audit-log.entity';
import { AuditService } from './audit.service';
import { AuditLogsController } from './auditlogs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  controllers: [AuditController, AuditLogsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
