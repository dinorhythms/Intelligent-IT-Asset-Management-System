import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { VendorController } from './vendor.controller';
import { VendorEntity } from './vendor.entity';
import { VendorService } from './vendor.service';

@Module({
  imports: [TypeOrmModule.forFeature([VendorEntity]), AuditModule],
  controllers: [VendorController],
  providers: [VendorService],
  exports: [VendorService],
})
export class VendorModule {}
