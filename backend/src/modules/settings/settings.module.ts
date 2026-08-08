import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { MailerModule } from '../mailer/mailer.module';
import { QrCodeModule } from '../qrcode/qrcode.module';
import { SettingsController } from './settings.controller';
import { SettingsEntity } from './settings.entity';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SettingsEntity]),
    forwardRef(() => QrCodeModule),
    MailerModule,
    AuditModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
