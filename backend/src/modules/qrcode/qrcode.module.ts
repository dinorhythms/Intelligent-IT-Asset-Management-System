import { forwardRef, Module } from '@nestjs/common';
import { AssetModule } from '../asset/asset.module';
import { AuditModule } from '../audit/audit.module';
import { SettingsModule } from '../settings/settings.module';
import { QrCodeController } from './qrcode.controller';
import { QrCodeService } from './qrcode.service';

@Module({
  imports: [
    forwardRef(() => AssetModule),
    forwardRef(() => SettingsModule),
    AuditModule,
  ],
  controllers: [QrCodeController],
  providers: [QrCodeService],
  exports: [QrCodeService],
})
export class QrCodeModule {}
