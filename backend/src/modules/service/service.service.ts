import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { AssetEntity } from '../asset/asset.entity';
import { ServiceEntity } from './service.entity';

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    private readonly aiService: AiService,
  ) {}

  async findAll() {
    return this.serviceRepository.find();
  }

  async findOne(id: string) {
    return this.serviceRepository.findOne({ where: { serviceId: id } });
  }

  async create(body: any) {
    const service = this.serviceRepository.create({
      ...body,
      serviceId: body.serviceId || `SRV-${Date.now()}`,
      serviceDesc: body.serviceDesc || 'Service request',
      serviceStatus: body.serviceStatus || 'active',
      predictiveImpact: body.predictiveImpact || 0.75,
      dashboardView: body.dashboardView !== false,
    }) as unknown as ServiceEntity;
    const saved = await this.serviceRepository.save(service);
    void this.runSchedulePipeline(saved, body);
    return saved;
  }

  async update(id: string, body: any) {
    const service = await this.serviceRepository.findOne({
      where: { serviceId: id },
    });
    if (!service) return null;
    Object.assign(service, body);
    const saved = await this.serviceRepository.save(service);
    void this.runSchedulePipeline(saved, body);
    return saved;
  }

  async remove(id: string) {
    const service = await this.serviceRepository.findOne({
      where: { serviceId: id },
    });
    if (service) {
      await this.serviceRepository.remove(service);
    }
    return { deleted: true, id };
  }

  private async runSchedulePipeline(service: ServiceEntity, body: any) {
    try {
      const payload = await this.buildSchedulePayload(service, body);
      const schedule = await this.aiService.maintenanceSchedule(payload);
      this.logger.log(
        `[auto-ai] Service ${service.serviceId} next maintenance: ${schedule.next_maintenance_date}`,
      );

      if (service.assetId) {
        const asset = await this.assetRepository.findOne({
          where: { assetId: service.assetId },
        });
        if (asset) {
          asset.nextMaintenanceDate = schedule.next_maintenance_date;
          await this.assetRepository.save(asset);
          this.logger.log(
            `[auto-ai] Asset ${asset.assetId} next_maintenance_date set to ${schedule.next_maintenance_date}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[auto-ai] Maintenance scheduling failed for ${service.serviceId}: ${
          (error as Error).message
        }`,
      );
    }
  }

  private async buildSchedulePayload(
    service: ServiceEntity,
    body: any,
  ): Promise<Record<string, any>> {
    const asset = service.assetId
      ? await this.assetRepository
          .findOne({ where: { assetId: service.assetId } })
          .catch(() => null)
      : null;

    return {
      asset_id: service.assetId,
      assetId: service.assetId,
      usage_hours:
        body.usage_hours ?? body.usageHours ?? asset?.usageHours ?? 0,
      last_maintenance_date:
        body.last_maintenance_date ?? body.lastMaintenanceDate,
      maintenance_interval_days:
        body.maintenance_interval_days ?? body.maintenanceIntervalDays ?? 90,
    };
  }
}
