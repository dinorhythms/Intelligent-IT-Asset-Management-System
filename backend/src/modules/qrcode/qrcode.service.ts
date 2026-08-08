import { Injectable } from '@nestjs/common';
import { AssetService } from '../asset/asset.service';
import { AuditService } from '../audit/audit.service';
import { QR_BASE_URL_KEY, SettingsService } from '../settings/settings.service';

@Injectable()
export class QrCodeService {
  constructor(
    private readonly assetService: AssetService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
  ) {}

  async generate(assetId: string) {
    const asset = await this.assetService.findOne(assetId);
    if (!asset) return null;
    return {
      assetId: asset.assetId,
      assetName: asset.assetName,
      qrCode: asset.qrCode,
      qrCodeUrl: asset.qrCodeUrl,
      uniqueId: asset.uniqueId,
    };
  }

  async getBaseUrl() {
    return { qrBaseUrl: await this.settingsService.getQrBaseUrl() };
  }

  async updateBaseUrl(newBaseUrl: string, actor?: string) {
    const cleaned = (newBaseUrl || '').trim().replace(/\/+$/, '');
    if (!cleaned) {
      return { error: 'A valid base URL is required' };
    }
    await this.settingsService.set(QR_BASE_URL_KEY, cleaned);
    const result = await this.assetService.regenerateAllQrCodes();
    await this.auditService.log('qrcode.baseurl.updated', {
      actor,
      entityType: 'settings',
      entityId: QR_BASE_URL_KEY,
      details: { qrBaseUrl: cleaned, regenerated: result.updated },
    });
    return { qrBaseUrl: cleaned, ...result };
  }
}
