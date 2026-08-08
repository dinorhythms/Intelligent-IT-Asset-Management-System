import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AssignmentEntity } from '../assignment/assignment.entity';
import { AuditService } from '../audit/audit.service';
import { MailerService } from '../mailer/mailer.service';
import { ServiceEntity } from '../service/service.entity';
import { SettingsService } from '../settings/settings.service';
import { AssetEntity } from './asset.entity';

export const CATEGORY_PREFIXES: Record<string, string> = {
  laptop: 'LAPTOP',
  notebook: 'LAPTOP',
  computer: 'LAPTOP',
  printer: 'PRINTER',
  server: 'SERVER',
};

const ASSET_STATUS_AVAILABLE = 'Available';
const ASSET_STATUS_ASSIGNED = 'Assigned';
const ASSET_STATUS_RETURNED = 'Returned';
export { ASSET_STATUS_AVAILABLE, ASSET_STATUS_ASSIGNED, ASSET_STATUS_RETURNED };

function normalizeCategory(category?: string): string {
  return (category || '').trim().toLowerCase();
}

export function prefixForCategory(category?: string): string {
  const normalized = normalizeCategory(category);
  if (CATEGORY_PREFIXES[normalized]) return CATEGORY_PREFIXES[normalized];
  if (normalized) {
    return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase() || 'ASSET';
  }
  return 'ASSET';
}

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @InjectRepository(PredictiveResultEntity)
    private readonly predictiveRepository: Repository<PredictiveResultEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    private readonly aiService: AiService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
    private readonly mailerService: MailerService,
  ) {}

  private toQrUrl(baseUrl: string, uniqueId: string): string {
    return `${baseUrl.replace(/\/$/, '')}/view/${uniqueId}`;
  }

  async buildQr(asset: AssetEntity): Promise<{ qrCode: string; qrCodeUrl: string }> {
    const baseUrl = await this.settingsService.getQrBaseUrl();
    const qrCodeUrl = this.toQrUrl(baseUrl, asset.uniqueId || asset.assetId);
    const qrCode = await QRCode.toDataURL(qrCodeUrl);
    return { qrCode, qrCodeUrl };
  }

  async nextAssetId(category?: string): Promise<string> {
    const prefix = prefixForCategory(category);
    const assets = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.assetId LIKE :pattern', { pattern: `${prefix}-%` })
      .getMany();
    let max = 0;
    for (const asset of assets) {
      const match = asset.assetId.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  async findAll(status?: string, category?: string) {
    const where: Record<string, string> = {};
    if (status) where.assetStatus = status;
    if (category) where.category = category;
    const list = await this.assetRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return Promise.all(
      list.map(async (asset) => {
        if (!asset.qrCode || !asset.qrCodeUrl) {
          const qr = await this.buildQr(asset);
          asset.qrCode = qr.qrCode;
          asset.qrCodeUrl = qr.qrCodeUrl;
        }
        return asset;
      }),
    );
  }

  async findOne(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    if (!asset.qrCode || !asset.qrCodeUrl) {
      const qr = await this.buildQr(asset);
      asset.qrCode = qr.qrCode;
      asset.qrCodeUrl = qr.qrCodeUrl;
    }
    return asset;
  }

  async findOneByUniqueId(uniqueId: string) {
    const asset = await this.assetRepository.findOne({
      where: { uniqueId },
    });
    if (!asset) return null;
    const resolved = await this.findOne(asset.assetId);
    const assignment = await this.assignmentRepository
      .findOne({
        where: { assetId: asset.assetId, status: 'assigned' },
        order: { assignedAt: 'DESC' },
      })
      .catch(() => null);
    if (!assignment) return resolved;
    return {
      ...resolved,
      currentAssignment: {
        id: assignment.id,
        assignedTo: assignment.userDisplayName || assignment.userName,
        username: assignment.userName,
        department: assignment.department,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,
      },
    };
  }

  async findByAssignedUser(userId: number) {
    const assignments = await this.assignmentRepository.find({
      where: { userId, status: 'assigned' },
      order: { assignedAt: 'DESC' },
    });
    return Promise.all(
      assignments.map(async (assignment) => {
        const asset = await this.assetRepository
          .findOne({ where: { assetId: assignment.assetId } })
          .catch(() => null);
        return {
          assignmentId: assignment.id,
          assetId: assignment.assetId,
          assetName: assignment.assetName || asset?.assetName,
          category: asset?.category,
          make: asset?.make,
          model: asset?.model,
          serialNumber: asset?.serialNumber,
          assetStatus: asset?.assetStatus,
          qrCodeUrl: asset?.qrCodeUrl,
          assignedAt: assignment.assignedAt,
          notes: assignment.notes,
        };
      }),
    );
  }

  async create(body: any, user?: any) {
    const category = body.category || body.assetType || 'asset';
    const make = body.make || body.manufacturer || '';
    const model = body.model || '';
    const assetId = randomUUID();
    const uniqueId = randomUUID();
    const qr = await this.buildQr({ uniqueId } as AssetEntity);

    const asset = this.assetRepository.create({
      ...body,
      assetId,
      uniqueId,
      category,
      make,
      model,
      assetName: body.assetName || [make, model].filter(Boolean).join(' ') || 'New Asset',
      assetStatus: body.assetStatus || ASSET_STATUS_AVAILABLE,
      assetLifecycle: body.assetLifecycle || 'procurement',
      predictiveScore: body.predictiveScore ?? 0.35,
      dashboardView: body.dashboardView !== false,
      qrCode: qr.qrCode,
      qrCodeUrl: qr.qrCodeUrl,
      receivedBy: body.receivedBy || user?.username || 'system',
      vendorId: body.vendorId,
      cost: body.cost === undefined || body.cost === null || body.cost === ''
        ? undefined
        : Number(body.cost),
      usageHours: body.usage_hours ?? body.usageHours,
      temperature: body.temperature,
      cpuUsage: body.cpu_usage ?? body.cpuUsage,
      vibration: body.vibration,
      loadFactor: body.load_factor ?? body.loadFactor,
      yearsOperation: body.years_operation ?? body.yearsOperation,
      nextMaintenanceDate: body.next_maintenance_date ?? body.nextMaintenanceDate,
    }) as unknown as AssetEntity;
    const saved = await this.assetRepository.save(asset);
    await this.auditService.log('asset.created', {
      actor: user?.username,
      entityType: 'asset',
      entityId: saved.assetId,
      details: { category, assetName: saved.assetName, qrCodeUrl: saved.qrCodeUrl },
    });
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async update(id: string, body: any, user?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    if (body.assetId && body.assetId !== asset.assetId) {
      throw new BadRequestException(
        'Asset ID is immutable and cannot be changed',
      );
    }

    const category = body.category || body.assetType || asset.category || asset.assetType || 'asset';
    const make = body.make || body.manufacturer || asset.make || asset.manufacturer || '';
    const model = body.model || asset.model || '';

    const { assetId, id: rowId, uniqueId, qrCode, qrCodeUrl, createdAt, updatedAt, ...editable } = body;
    Object.assign(asset, editable);
    asset.category = category;
    asset.make = make;
    asset.model = model;
    asset.assetName = body.assetName || [make, model].filter(Boolean).join(' ') || asset.assetName;
    asset.assetStatus = body.assetStatus || asset.assetStatus;
    asset.vendor = body.vendor ?? asset.vendor;
    asset.vendorId = body.vendorId ?? asset.vendorId;
    asset.cost =
      body.cost === undefined || body.cost === null || body.cost === ''
        ? asset.cost
        : Number(body.cost);
    asset.usageHours = body.usage_hours ?? body.usageHours ?? asset.usageHours;
    asset.temperature = body.temperature ?? asset.temperature;
    asset.cpuUsage = body.cpu_usage ?? body.cpuUsage ?? asset.cpuUsage;
    asset.vibration = body.vibration ?? asset.vibration;
    asset.loadFactor = body.load_factor ?? body.loadFactor ?? asset.loadFactor;
    asset.yearsOperation = body.years_operation ?? body.yearsOperation ?? asset.yearsOperation;
    asset.nextMaintenanceDate = body.next_maintenance_date ?? body.nextMaintenanceDate ?? asset.nextMaintenanceDate;

    if (!asset.uniqueId) {
      asset.uniqueId = randomUUID();
    }
    const qr = await this.buildQr(asset);
    asset.qrCode = qr.qrCode;
    asset.qrCodeUrl = qr.qrCodeUrl;

    const saved = await this.assetRepository.save(asset);
    await this.auditService.log('asset.updated', {
      actor: user?.username,
      entityType: 'asset',
      entityId: saved.assetId,
      details: { category },
    });
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async remove(id: string, user?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (asset) {
      await this.auditService.log('asset.deleted', {
        actor: user?.username,
        entityType: 'asset',
        entityId: asset.assetId,
      });
      await this.assetRepository.remove(asset);
    }
    return { deleted: true, id };
  }

  async regenerateAllQrCodes() {
    const assets = await this.assetRepository.find();
    let updated = 0;
    for (const asset of assets) {
      if (!asset.uniqueId) asset.uniqueId = randomUUID();
      const qr = await this.buildQr(asset);
      asset.qrCode = qr.qrCode;
      asset.qrCodeUrl = qr.qrCodeUrl;
      await this.assetRepository.save(asset);
      updated++;
    }
    return { updated, qrBaseUrl: await this.settingsService.getQrBaseUrl() };
  }

  scan(body: any) {
    return {
      scanned: true,
      assetIdentifier: body.assetIdentifier || 'AST-1001',
      recognized: true,
    };
  }

  private yearsFromDates(asset: AssetEntity): number {
    const start = asset.deliveryDate || asset.createdAt;
    if (!start) return 0;
    const startMs = new Date(start).getTime();
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, (Date.now() - startMs) / (365.25 * 24 * 60 * 60 * 1000));
  }

  async getValue(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;

    const cost = Number(asset.cost);
    if (!cost || cost <= 0) {
      return {
        assetId: asset.assetId,
        assetName: asset.assetName,
        cost: null,
        estimatedValue: null,
        recommendedAuctionValue: null,
        depreciationPercent: null,
        note: 'No purchase cost recorded for this asset. Add a cost to enable valuation.',
      };
    }

    let services: ServiceEntity[] = [];
    try {
      services = await this.serviceRepository.find({
        where: { assetId: asset.assetId },
      });
    } catch {
      services = [];
    }
    let serviceCost = 0;
    for (const service of services) {
      serviceCost += Number(service.cost) || 0;
    }
    const serviceCount = services.length;

    const yearsOperation =
      Number(asset.yearsOperation) || this.yearsFromDates(asset);
    const usageYears = (Number(asset.usageHours) || 0) / 8760;
    const effectiveYears = yearsOperation + usageYears;

    const annualDepreciationRate = 0.2;
    const salvageValue = Math.round(cost * 0.1 * 100) / 100;

    let estimatedValue = Math.max(
      cost * (1 - annualDepreciationRate * effectiveYears),
      salvageValue,
    );
    const careBoost = Math.min(0.05 * serviceCount, 0.1);
    estimatedValue = Math.round(estimatedValue * (1 + careBoost) * 100) / 100;

    const recommendedAuctionValue = Math.round(estimatedValue * 0.9 * 100) / 100;
    const depreciationPercent =
      Math.max(0, Math.round((1 - estimatedValue / cost) * 10000)) / 100;

    return {
      assetId: asset.assetId,
      assetName: asset.assetName,
      cost,
      serviceCost: Math.round(serviceCost * 100) / 100,
      serviceCount,
      estimatedValue,
      recommendedAuctionValue,
      depreciationPercent,
      salvageValue,
      basis: {
        effectiveYears: Math.round(effectiveYears * 10) / 10,
        annualDepreciationRate,
      },
    };
  }


  async predict(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    try {
      const payload = this.buildTelemetryPayload(asset, asset);
      const prediction = await this.aiService.predict(payload);
      const predictiveScore =
        Number(prediction.predictive_score) || asset.predictiveScore || 0.58;
      const maintenanceForecast = this.forecastFor(predictiveScore);
      const anomaly = await this.aiService
        .detectAnomaly(payload)
        .catch(() => ({ anomaly_detected: predictiveScore > 0.7 }));
      await this.assetRepository.update(
        { assetId: asset.assetId },
        { predictiveScore },
      );
      await this.saveSummary(
        asset.assetId,
        predictiveScore,
        maintenanceForecast,
        Boolean(anomaly?.anomaly_detected),
      );
      if (anomaly?.anomaly_detected || predictiveScore > 0.7) {
        void this.notifyRisk(
          asset,
          predictiveScore,
          Boolean(anomaly?.anomaly_detected),
        );
      }
      return {
        assetId: id,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected: Boolean(anomaly?.anomaly_detected),
        rulDays: prediction.rul_days,
      };
    } catch (error) {
      this.logger.warn(
        `[auto-ai] Predict for ${id} failed, using stored score: ${
          (error as Error).message
        }`,
      );
      const predictiveScore = asset.predictiveScore || 0.58;
      return {
        assetId: id,
        predictiveScore,
        maintenanceForecast: this.forecastFor(predictiveScore),
        anomalyDetected: predictiveScore > 0.7,
        fallback: true,
      };
    }
  }

  private forecastFor(score: number) {
    return score > 0.6 ? 'scheduled' : 'monitor';
  }

  private buildTelemetryPayload(asset: AssetEntity, body: any) {
    return {
      asset_id: asset.assetId,
      assetId: asset.assetId,
      usage_hours: body.usage_hours ?? body.usageHours ?? asset.usageHours,
      temperature: body.temperature ?? asset.temperature,
      cpu_usage: body.cpu_usage ?? body.cpuUsage ?? asset.cpuUsage,
      vibration: body.vibration ?? asset.vibration,
      load_factor: body.load_factor ?? body.loadFactor ?? asset.loadFactor,
      years_operation:
        body.years_operation ?? body.yearsOperation ?? asset.yearsOperation,
    };
  }

  private async saveSummary(
    assetId: string,
    predictiveScore: number,
    maintenanceForecast: string,
    anomalyDetected: boolean,
  ) {
    await this.predictiveRepository.save(
      this.predictiveRepository.create({
        assetId,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected,
      }),
    );
  }

  private async refreshPredictiveData(asset: AssetEntity, body: any) {
    try {
      const payload = this.buildTelemetryPayload(asset, body);
      const [prediction, anomaly] = await Promise.all([
        this.aiService.predict(payload),
        this.aiService.detectAnomaly(payload),
      ]);

      const predictiveScore =
        Number(prediction.predictive_score) || asset.predictiveScore || 0.35;
      const maintenanceForecast = this.forecastFor(predictiveScore);
      const anomalyDetected = Boolean(anomaly?.anomaly_detected);

      await this.assetRepository.update(
        { assetId: asset.assetId },
        { predictiveScore },
      );
      await this.saveSummary(
        asset.assetId,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected,
      );

      if (anomalyDetected || predictiveScore > 0.7) {
        void this.notifyRisk(asset, predictiveScore, anomalyDetected);
      }

      this.logger.log(
        `[auto-ai] Asset ${asset.assetId} updated: predictiveScore=${predictiveScore}, forecast=${maintenanceForecast}, anomaly=${anomalyDetected}`,
      );
    } catch (error) {
      this.logger.error(
        `[auto-ai] Failed to refresh predictive data for ${asset.assetId}: ${
          (error as Error).message
        }`,
      );
    }
  }

  private notifyRisk(
    asset: AssetEntity,
    predictiveScore: number,
    anomalyDetected: boolean,
  ) {
    return this.mailerService.sendToAdmins('AI alert: unusual asset activity', [
      `Asset "${asset.assetName || asset.assetId}" (${asset.assetId}) has flagged unusual activity.`,
      `Predictive risk score: ${predictiveScore}`,
      `Anomaly detected: ${anomalyDetected ? 'Yes' : 'No'}`,
      'Please review the asset details and schedule maintenance if needed.',
    ]);
  }
}
