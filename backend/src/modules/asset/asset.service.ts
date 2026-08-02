import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AssetEntity } from './asset.entity';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @InjectRepository(PredictiveResultEntity)
    private readonly predictiveRepository: Repository<PredictiveResultEntity>,
    private readonly aiService: AiService,
  ) {}

  async findAll(status?: string) {
    const list = await this.assetRepository.find({
      where: status ? { assetStatus: status } : undefined,
    });
    return Promise.all(
      list.map(async (asset) => ({
        ...asset,
        qrCode: asset.qrCode || (await QRCode.toDataURL(asset.assetId)),
      })),
    );
  }

  async findOne(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    return asset
      ? {
          ...asset,
          qrCode: asset.qrCode || (await QRCode.toDataURL(asset.assetId)),
        }
      : null;
  }

  async create(body: any) {
    const asset = this.assetRepository.create({
      ...body,
      assetId: body.assetId || `AST-${Date.now()}`,
      assetName: body.assetName || 'New Asset',
      assetStatus: body.assetStatus || 'pending',
      assetLifecycle: body.assetLifecycle || 'procurement',
      predictiveScore: body.predictiveScore ?? 0.35,
      dashboardView: body.dashboardView !== false,
      qrCode: await QRCode.toDataURL(
        body.assetId || body.id || 'asset-default',
      ),
      usageHours: body.usage_hours ?? body.usageHours,
      temperature: body.temperature,
      cpuUsage: body.cpu_usage ?? body.cpuUsage,
      vibration: body.vibration,
      loadFactor: body.load_factor ?? body.loadFactor,
      yearsOperation: body.years_operation ?? body.yearsOperation,
      nextMaintenanceDate: body.next_maintenance_date ?? body.nextMaintenanceDate,
    }) as unknown as AssetEntity;
    const saved = await this.assetRepository.save(asset);
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async update(id: string, body: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    Object.assign(asset, body);
    asset.usageHours = body.usage_hours ?? body.usageHours ?? asset.usageHours;
    asset.temperature = body.temperature ?? asset.temperature;
    asset.cpuUsage = body.cpu_usage ?? body.cpuUsage ?? asset.cpuUsage;
    asset.vibration = body.vibration ?? asset.vibration;
    asset.loadFactor = body.load_factor ?? body.loadFactor ?? asset.loadFactor;
    asset.yearsOperation =
      body.years_operation ?? body.yearsOperation ?? asset.yearsOperation;
    asset.nextMaintenanceDate =
      body.next_maintenance_date ??
      body.nextMaintenanceDate ??
      asset.nextMaintenanceDate;
    const saved = await this.assetRepository.save(asset);
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async remove(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (asset) {
      await this.assetRepository.remove(asset);
    }
    return { deleted: true, id };
  }

  scan(body: any) {
    return {
      scanned: true,
      assetIdentifier: body.assetIdentifier || 'AST-1001',
      recognized: true,
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
}
