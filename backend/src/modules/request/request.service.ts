import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { AssetEntity } from '../asset/asset.entity';
import { RequestEntity } from './request.entity';

const TELEMETRY_KEYS = [
  'usage_hours',
  'temperature',
  'cpu_usage',
  'vibration',
  'load_factor',
  'years_operation',
];

@Injectable()
export class RequestService {
  private readonly logger = new Logger(RequestService.name);

  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    private readonly aiService: AiService,
  ) {}

  async findAll() {
    return this.requestRepository.find();
  }

  async findOne(id: string) {
    return this.requestRepository.findOne({ where: { requestNo: id } });
  }

  async create(body: any) {
    const request = this.requestRepository.create({
      ...body,
      requestNo: body.requestNo || `REQ-${Date.now()}`,
      assetName: body.assetName || 'Unnamed asset',
      assetType: body.assetType || 'hardware',
      assetIdentifier: body.assetIdentifier || `AST-${Date.now()}`,
      approvalStatus: body.approvalStatus || 'pending',
      requestStatus: body.requestStatus || 'open',
      requestPriority: body.requestPriority || 'normal',
    }) as unknown as RequestEntity;
    const saved = await this.requestRepository.save(request);
    void this.runAnomalyPipeline(saved, body);
    return saved;
  }

  async update(id: string, body: any) {
    const request = await this.requestRepository.findOne({
      where: { requestNo: id },
    });
    if (!request) return null;
    Object.assign(request, body);
    return this.requestRepository.save(request);
  }

  async remove(id: string) {
    const request = await this.requestRepository.findOne({
      where: { requestNo: id },
    });
    if (request) {
      await this.requestRepository.remove(request);
    }
    return { deleted: true, id };
  }

  private async buildAnomalyPayload(
    request: RequestEntity,
    body: any,
  ): Promise<Record<string, any>> {
    const base: Record<string, any> = {
      asset_id: request.assetIdentifier,
      assetId: request.assetIdentifier,
      usage_hours: body.usage_hours,
      temperature: body.temperature,
      cpu_usage: body.cpu_usage,
      vibration: body.vibration,
      load_factor: body.load_factor,
      years_operation: body.years_operation,
    };

    if (!TELEMETRY_KEYS.some((key) => body[key] !== undefined)) {
      const asset = await this.assetRepository.findOne({
        where: { assetId: request.assetIdentifier },
      });
      if (asset) {
        base.usage_hours = asset.usageHours;
        base.temperature = asset.temperature;
        base.cpu_usage = asset.cpuUsage;
        base.vibration = asset.vibration;
        base.load_factor = asset.loadFactor;
        base.years_operation = asset.yearsOperation;
      }
    }
    return base;
  }

  private async runAnomalyPipeline(request: RequestEntity, body: any) {
    try {
      const payload = await this.buildAnomalyPayload(request, body);
      const anomaly = await this.aiService.detectAnomaly(payload);
      this.logger.log(
        `[auto-ai] Request ${request.requestNo} anomaly_detected=${anomaly.anomaly_detected}`,
      );

      if (anomaly.anomaly_detected) {
        const recommendation = await this.aiService.recommend({
          ...payload,
          anomaly_detected: anomaly.anomaly_detected,
        });
        this.logger.log(
          `[auto-ai] Request ${request.requestNo} recommendations: ${JSON.stringify(
            recommendation.recommended_actions,
          )}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[auto-ai] Anomaly pipeline failed for ${request.requestNo}: ${
          (error as Error).message
        }`,
      );
    }
  }
}
