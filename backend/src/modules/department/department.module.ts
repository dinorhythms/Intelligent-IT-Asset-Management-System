import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { DepartmentController } from './department.controller';
import { DepartmentEntity } from './department.entity';
import { DepartmentService } from './department.service';

@Module({
  imports: [TypeOrmModule.forFeature([DepartmentEntity]), AuditModule],
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}
