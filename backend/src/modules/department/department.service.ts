import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { DepartmentEntity } from './department.entity';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepository: Repository<DepartmentEntity>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(status?: string) {
    const where = status ? { status } : {};
    return this.departmentRepository.find({
      where,
      order: { departmentName: 'ASC' },
    });
  }

  async findOne(id: string) {
    return this.departmentRepository.findOne({ where: { departmentId: id } });
  }

  async create(body: any, actor?: string) {
    if (!body.departmentName || !String(body.departmentName).trim()) {
      throw new BadRequestException('Department name is required');
    }
    const departmentName = String(body.departmentName).trim();
    const existing = await this.departmentRepository.findOne({
      where: { departmentName },
    });
    if (existing) {
      throw new ConflictException(
        'A department with that name already exists',
      );
    }

    const department = this.departmentRepository.create({
      departmentId: randomUUID(),
      departmentName,
      description: body.description,
      status: body.status || 'active',
    }) as unknown as DepartmentEntity;
    const saved = await this.departmentRepository.save(department);
    await this.auditService.log('department.created', {
      actor,
      entityType: 'department',
      entityId: saved.departmentId,
      details: { departmentName: saved.departmentName, status: saved.status },
    });
    return saved;
  }

  async update(id: string, body: any, actor?: string) {
    const department = await this.departmentRepository.findOne({
      where: { departmentId: id },
    });
    if (!department) throw new NotFoundException('Department not found');

    if (body.departmentId && body.departmentId !== department.departmentId) {
      throw new BadRequestException(
        'Department ID is immutable and cannot be changed',
      );
    }
    if (
      body.departmentName &&
      body.departmentName !== department.departmentName
    ) {
      const taken = await this.departmentRepository.findOne({
        where: { departmentName: body.departmentName },
      });
      if (taken && taken.id !== department.id) {
        throw new ConflictException(
          'A department with that name already exists',
        );
      }
      department.departmentName = String(body.departmentName).trim();
    }
    if (body.description !== undefined) {
      department.description = body.description;
    }
    if (body.status !== undefined) department.status = body.status;

    const saved = await this.departmentRepository.save(department);
    await this.auditService.log('department.updated', {
      actor,
      entityType: 'department',
      entityId: saved.departmentId,
      details: {
        departmentName: saved.departmentName,
        status: saved.status,
      },
    });
    return saved;
  }

  async remove(id: string, actor?: string) {
    const department = await this.departmentRepository.findOne({
      where: { departmentId: id },
    });
    if (!department) throw new NotFoundException('Department not found');
    await this.auditService.log('department.deleted', {
      actor,
      entityType: 'department',
      entityId: department.departmentId,
      details: { departmentName: department.departmentName },
    });
    await this.departmentRepository.remove(department);
    return { deleted: true, id };
  }
}
