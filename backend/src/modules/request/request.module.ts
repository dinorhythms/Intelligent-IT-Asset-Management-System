import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MailerModule } from '../mailer/mailer.module';
import { RequestController } from './request.controller';
import { RequestEntity } from './request.entity';
import { RequestService } from './request.service';

@Module({
  imports: [TypeOrmModule.forFeature([RequestEntity]), MailerModule, AuditModule],
  controllers: [RequestController],
  providers: [RequestService],
})
export class RequestModule {}
