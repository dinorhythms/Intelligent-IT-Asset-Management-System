import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepository: Repository<AuditLogEntity>,
  ) {}

  async log(action: string, options: {
    actor?: string;
    entityType?: string;
    entityId?: string;
    details?: unknown;
  } = {}) {
    try {
      const entry = this.auditRepository.create({
        action,
        actor: options.actor,
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
}
