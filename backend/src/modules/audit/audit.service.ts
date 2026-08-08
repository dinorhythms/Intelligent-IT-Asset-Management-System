import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './audit-log.entity';

const HUMAN_ACTION: Record<string, string> = {
  'category.created': 'created a category',
  'category.updated': 'updated a category',
  'category.deleted': 'deleted a category',
  'vendor.created': 'created a vendor',
  'vendor.updated': 'updated a vendor',
  'vendor.deleted': 'deleted a vendor',
  'asset.created': 'created an asset',
  'asset.updated': 'updated an asset',
  'asset.deleted': 'deleted an asset',
  'asset.metrics.updated': 'updated telemetry metrics for an asset',
  'asset.metrics.missing': 'notified admins of missing AI metrics for an asset',
  'service.created': 'recorded a service',
  'service.updated': 'updated a service record',
  'service.deleted': 'deleted a service record',
  'request.created': 'submitted a request',
  'request.updated': 'updated a request',
  'request.deleted': 'deleted a request',
  'assignment.created': 'assigned an asset to a user',
  'assignment.updated': 'updated an assignment',
  'assignment.deleted': 'removed an assignment',
  'assignment.returned': 'returned an asset',
  'user.created': 'created a user account',
  'user.updated': 'updated a user account',
  'user.deleted': 'deleted a user account',
  'department.created': 'created a department',
  'department.updated': 'updated a department',
  'department.deleted': 'deleted a department',
  'qrcode.baseurl.updated': 'updated the QR base URL',
  'settings.updated': 'updated settings',
  'auth.login': 'logged in',
  'auth.logout': 'logged out',
};

function buildDescription(
  action: string,
  entityType?: string,
  details?: unknown,
): string {
  const human = HUMAN_ACTION[action];
  if (human) return human;
  if (entityType) {
    const label = entityType.replace(/_/g, ' ');
    const verb =
      action.includes('.deleted')
        ? 'deleted'
        : action.includes('.created')
          ? 'created'
          : action.includes('.updated')
            ? 'updated'
            : action.includes('.returned')
              ? 'returned'
              : 'modified';
    return `${verb} a ${label}`;
  }
  return action.replace(/\./g, ' ');
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  async forAsset(assetId: string) {
    try {
      return await this.auditRepository.find({
        where: { entityId: assetId },
        order: { createdAt: 'DESC' },
      });
    } catch {
      return [];
    }
  }

  async log(action: string, options: {
    actor?: string;
    entityType?: string;
    entityId?: string;
    user?: string;
    description?: string;
    details?: unknown;
  } = {}) {
    try {
      const entry = this.auditRepository.create({
        action,
        actor: options.actor,
        user: options.user || options.actor,
        description:
          options.description ||
          buildDescription(action, options.entityType, options.details),
        entityType: options.entityType,
        entityId: options.entityId,
        details:
          typeof options.details === 'string'
            ? options.details
            : options.details
              ? JSON.stringify(options.details)
              : undefined,
      });
      return this.auditRepository.save(entry);
    } catch (error) {
      // Audit logging must never break the main operation.
      return null;
    }
  }

  async findAll() {
    return this.auditRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.auditRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
