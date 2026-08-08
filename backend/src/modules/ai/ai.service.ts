import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { AxiosRequestConfig } from 'axios';
import { Repository } from 'typeorm';
import { AssetEntity } from '../asset/asset.entity';
import { AiResultEntity } from './ai-result.entity';

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000;

type HttpMethod = 'get' | 'post';

@Injectable()
export class AiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private healthTimer: NodeJS.Timeout | undefined;

  constructor(
    @InjectRepository(AiResultEntity)
    private readonly aiResultRepository: Repository<AiResultEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
  ) {
    this.baseUrl = (
      process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001'
    ).replace(/\/$/, '');
    this.apiKey = process.env.AI_SERVICE_API_KEY || 'ai-service-dev-key';
    this.maxRetries = Number(process.env.AI_SERVICE_MAX_RETRIES || 3);
  }

  onModuleInit() {
    this.logger.log(`AI microservice base URL: ${this.baseUrl}`);
    void this.checkHealth();
    this.healthTimer = setInterval(
      () => void this.checkHealth(),
      HEALTH_CHECK_INTERVAL_MS,
    );
    this.logger.log(
      `AI health check scheduled every ${
        HEALTH_CHECK_INTERVAL_MS / 60000
      } minutes`,
    );
  }

  onModuleDestroy() {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = undefined;
    }
  }

  private async checkHealth() {
    try {
      const health = await this.getWithRetry('/health', 5000);
      this.logger.log(`AI service health OK: ${JSON.stringify(health)}`);
    } catch (error) {
      this.logger.warn(
        `AI service health check failed: ${(error as Error).message}`,
      );
    }
  }

  private requestConfig(timeoutMs = 10000): AxiosRequestConfig {
    return {
      timeout: timeoutMs,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
    };
  }

  private async requestWithRetry<T>(
    method: HttpMethod,
    path: string,
    payload?: unknown,
    timeoutMs = 10000,
  ): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response =
          method === 'post'
            ? await axios.post<T>(
                `${this.baseUrl}${path}`,
                payload,
                this.requestConfig(timeoutMs),
              )
            : await axios.get<T>(
                `${this.baseUrl}${path}`,
                this.requestConfig(timeoutMs),
              );
        return response.data;
      } catch (error: any) {
        lastError = error;
        const retryable =
          error.code === 'ECONNREFUSED' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          !error.response;
        if (!retryable || attempt === this.maxRetries) break;

        const delay = 250 * Math.pow(2, attempt - 1);
        this.logger.warn(
          `[ai-service] ${path} attempt ${attempt} failed (${
            error.code || error.message
          }). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    this.logger.error(
      `[ai-service] ${path} failed after ${this.maxRetries} attempts: ${lastError?.message}`,
    );
    throw new HttpException(
      {
        error: 'AI service unavailable',
        message: `Could not reach the AI microservice at ${this.baseUrl}. Ensure it is running with: python app.py`,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  private postWithRetry<T>(path: string, payload: unknown): Promise<T> {
    return this.requestWithRetry<T>('post', path, payload);
  }

  private getWithRetry<T>(path: string, timeoutMs = 10000): Promise<T> {
    return this.requestWithRetry<T>('get', path, undefined, timeoutMs);
  }

  private async persist(
    kind: string,
    requestPayload: any,
    responsePayload: any,
  ) {
    try {
      const assetId =
        requestPayload?.asset_id ||
        requestPayload?.assetId ||
        responsePayload?.asset_id ||
        'unknown';
      await this.aiResultRepository.save(
        this.aiResultRepository.create({
          kind,
          assetId,
          requestPayload,
          responsePayload,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `[ai-service] Failed to persist ${kind} result: ${
          (error as Error).message
        }`,
      );
    }
  }

  async health() {
    return this.getWithRetry('/health', 5000);
  }

  async predict(payload: Record<string, any>): Promise<any> {
    const result = await this.postWithRetry('/predict', payload);
    await this.persist('predict', payload, result);
    return result;
  }

  async detectAnomaly(payload: Record<string, any>): Promise<any> {
    const result = await this.postWithRetry('/anomaly', payload);
    await this.persist('anomaly', payload, result);
    return result;
  }

  async recommend(payload: Record<string, any>): Promise<any> {
    const result = await this.postWithRetry('/recommend', payload);
    await this.persist('recommend', payload, result);
    return result;
  }

  async maintenanceSchedule(payload: Record<string, any>): Promise<any> {
    const result = await this.postWithRetry('/maintenance_schedule', payload);
    await this.persist('maintenance_schedule', payload, result);
    return result;
  }

  private riskBand(score: number | null | undefined): 'low' | 'medium' | 'high' {
    const value = Number(score);
    if (Number.isNaN(value)) return 'low';
    if (value < 0.4) return 'low';
    if (value <= 0.7) return 'medium';
    return 'high';
  }

  async history(kind?: string) {
    const where = kind ? { kind } : undefined;
    const events = await this.aiResultRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const assets = await this.assetRepository.find();
    const nameById = new Map(
      assets.map((asset) => [asset.assetId, asset.assetName || asset.assetId]),
    );
    return events.map((event) => {
      const score =
        event.kind === 'predict'
          ? Number(event.responsePayload?.predictive_score)
          : null;
      return {
        id: event.id,
        kind: event.kind,
        assetId: event.assetId,
        assetName: nameById.get(event.assetId) || event.assetId,
        riskBand: this.riskBand(score),
        createdAt: event.createdAt,
        requestPayload: event.requestPayload,
        responsePayload: event.responsePayload,
      };
    });
  }
}
