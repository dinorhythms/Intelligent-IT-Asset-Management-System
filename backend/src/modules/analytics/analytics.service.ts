import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PredictiveResultEntity } from './predictive-result.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PredictiveResultEntity)
    private readonly predictiveRepository: Repository<PredictiveResultEntity>,
  ) {}

  async getDashboard() {
    const results = await this.predictiveRepository.find();
    const assetUtilization = results.length
      ? Math.round(
          (results.reduce((sum, item) => sum + (item.predictiveScore || 0), 0) /
            results.length) *
            100,
        )
      : 78;
    const servicePerformance = results.length
      ? Math.min(
          99,
          80 + results.filter((item) => item.anomalyDetected).length * 3,
        )
      : 88;

    return {
      assetUtilization,
      servicePerformance,
      requestTrends: [4, 6, 7, 5],
      complianceStatus: results.some((item) => item.anomalyDetected)
        ? 'review-needed'
        : 'compliant',
    };
  }
}
