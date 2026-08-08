import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { AssetEntity } from '../asset/asset.entity';
import { AssignmentEntity } from '../assignment/assignment.entity';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AuditService } from '../audit/audit.service';
import { UserEntity } from '../auth/user.entity';
import { MailerService } from '../mailer/mailer.service';
import { ServiceEntity } from './service.entity';

@Injectable()
export class ServiceService {
  private readonly logger = new Logger(ServiceService.name);

  constructor(
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(PredictiveResultEntity)
    private readonly predictiveRepository: Repository<PredictiveResultEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly aiService: AiService,
    private readonly auditService: AuditService,
    private readonly mailerService: MailerService,
  ) {}

  async findAll() {
    return this.serviceRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(username: string) {
    const assignments = await this.assignmentRepository.find({
      where: { userName: username, status: 'assigned' },
    });
    const assetIds = assignments.map((assignment) => assignment.assetId);
    if (assetIds.length === 0) return [];
    return this.serviceRepository
      .createQueryBuilder('service')
      .where('service.assetId IN (:...assetIds)', { assetIds })
      .orderBy('service.createdAt', 'DESC')
      .getMany();
  }

  async findByAsset(assetId: string) {
    return this.serviceRepository.find({
      where: { assetId },
      order: { serviceDate: 'DESC' },
    });
  }

  async findOne(id: string) {
    return this.serviceRepository.findOne({ where: { serviceId: id } });
  }

  private async validateTechnician(technician?: string): Promise<void> {
    if (!technician || !String(technician).trim()) {
      throw new BadRequestException(
        'A technician must be assigned to a service record',
      );
    }
    const user = await this.userRepository
      .findOne({ where: { username: String(technician).trim() } })
      .catch(() => null);
    if (user) return;
    throw new BadRequestException(
      'The selected technician must be a registered user (Technician, Admin, or ICT/IT staff)',
    );
  }

  async create(body: any) {
    await this.validateTechnician(body.technician);
    const service = this.serviceRepository.create({
      ...body,
      serviceId: randomUUID(),
      serviceDesc: body.serviceDesc || 'Service request',
      serviceStatus: body.serviceStatus || 'active',
      predictiveImpact: body.predictiveImpact || 0.75,
      dashboardView: body.dashboardView !== false,
    }) as unknown as ServiceEntity;
    const saved = await this.serviceRepository.save(service);
    await this.auditService.log('service.created', {
      actor: body.technician || undefined,
      entityType: 'service',
      entityId: saved.serviceId,
      details: {
        serviceDesc: saved.serviceDesc,
        assetId: saved.assetId,
        technician: saved.technician,
        serviceStatus: saved.serviceStatus,
      },
    });
    void this.mailerService.sendToAdminAndTechnicians(
      'Service record created',
      [
        `A new service record has been created.`,
        `Service: ${saved.serviceDesc}`,
        `Asset: ${saved.assetId || '—'}`,
        `Technician: ${saved.technician || '—'}`,
        `Status: ${saved.serviceStatus}`,
        `Date: ${saved.serviceDate || '—'}`,
      ],
    );
    void this.runSchedulePipeline(saved, body);
    return saved;
  }

  async update(id: string, body: any) {
    const service = await this.serviceRepository.findOne({
      where: { serviceId: id },
    });
    if (!service) throw new NotFoundException('Service record not found');

    if (body.serviceId && body.serviceId !== service.serviceId) {
      throw new BadRequestException(
        'Service ID is immutable and cannot be changed',
      );
    }
    if (body.technician !== undefined) {
      await this.validateTechnician(body.technician);
    }

    const { serviceId, id: rowId, createdAt, updatedAt, ...editable } = body;
    Object.assign(service, editable);
    const saved = await this.serviceRepository.save(service);
    await this.auditService.log('service.updated', {
      actor: body.technician || undefined,
      entityType: 'service',
      entityId: saved.serviceId,
      details: {
        serviceDesc: saved.serviceDesc,
        assetId: saved.assetId,
        technician: saved.technician,
        serviceStatus: saved.serviceStatus,
      },
    });
    void this.mailerService.sendToAdminAndTechnicians(
      'Service record updated',
      [
        `Service record ${saved.serviceId} has been updated.`,
        `Service: ${saved.serviceDesc}`,
        `Asset: ${saved.assetId || '—'}`,
        `Technician: ${saved.technician || '—'}`,
        `Status: ${saved.serviceStatus}`,
        `Next maintenance date is being recalculated.`,
      ],
    );
    void this.runSchedulePipeline(saved, body);
    return saved;
  }

  async remove(id: string) {
    const service = await this.serviceRepository.findOne({
      where: { serviceId: id },
    });
    if (service) {
      await this.auditService.log('service.deleted', {
        actor: service.technician || undefined,
        entityType: 'service',
        entityId: service.serviceId,
        details: { serviceDesc: service.serviceDesc },
      });
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
        await this.predictiveRepository.save(
          this.predictiveRepository.create({
            assetId: service.assetId,
            nextMaintenanceDate: schedule.next_maintenance_date,
          }),
        );
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
        body.last_maintenance_date ??
        body.lastMaintenanceDate ??
        body.serviceDate ??
        asset?.nextMaintenanceDate,
      maintenance_interval_days:
        body.maintenance_interval_days ?? body.maintenanceIntervalDays ?? 90,
    };
  }
}
