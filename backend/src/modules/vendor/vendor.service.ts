import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { VendorEntity } from './vendor.entity';

@Injectable()
export class VendorService {
  constructor(
    @InjectRepository(VendorEntity)
    private readonly vendorRepository: Repository<VendorEntity>,
    private readonly auditService: AuditService,
  ) {}

  private async nextVendorId(): Promise<string> {
    const vendors = await this.vendorRepository.find();
    let max = 0;
    for (const vendor of vendors) {
      const match = vendor.vendorId.match(/^VEND-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `VEND-${String(max + 1).padStart(3, '0')}`;
  }

  async findAll(status?: string) {
    const where = status ? { status } : {};
    return this.vendorRepository.find({
      where,
      order: { vendorName: 'ASC' },
    });
  }

  async findOne(id: string) {
    return this.vendorRepository.findOne({ where: { vendorId: id } });
  }

  async create(body: any, actor?: string) {
    if (!body.vendorName || !String(body.vendorName).trim()) {
      throw new BadRequestException('Vendor name is required');
    }
    const vendorName = String(body.vendorName).trim();
    const existing = await this.vendorRepository.findOne({ where: { vendorName } });
    if (existing) {
      throw new ConflictException('A vendor with that name already exists');
    }

    const vendor = this.vendorRepository.create({
      vendorId: body.vendorId || (await this.nextVendorId()),
      vendorName,
      contactPerson: body.contactPerson,
      phoneNumber: body.phoneNumber,
      email: body.email,
      address: body.address,
      status: body.status || 'active',
    }) as unknown as VendorEntity;
    const saved = await this.vendorRepository.save(vendor);
    await this.auditService.log('vendor.created', {
      actor,
      entityType: 'vendor',
      entityId: saved.vendorId,
      details: { vendorName: saved.vendorName, status: saved.status },
    });
    return saved;
  }

  async update(id: string, body: any, actor?: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { vendorId: id },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    if (body.vendorId && body.vendorId !== vendor.vendorId) {
      throw new BadRequestException('Vendor ID is immutable and cannot be changed');
    }
    if (body.vendorName && body.vendorName !== vendor.vendorName) {
      const taken = await this.vendorRepository.findOne({
        where: { vendorName: body.vendorName },
      });
      if (taken && taken.id !== vendor.id) {
        throw new ConflictException('A vendor with that name already exists');
      }
      vendor.vendorName = String(body.vendorName).trim();
    }
    if (body.contactPerson !== undefined) vendor.contactPerson = body.contactPerson;
    if (body.phoneNumber !== undefined) vendor.phoneNumber = body.phoneNumber;
    if (body.email !== undefined) vendor.email = body.email;
    if (body.address !== undefined) vendor.address = body.address;
    if (body.status !== undefined) vendor.status = body.status;

    const saved = await this.vendorRepository.save(vendor);
    await this.auditService.log('vendor.updated', {
      actor,
      entityType: 'vendor',
      entityId: saved.vendorId,
      details: { vendorName: saved.vendorName, status: saved.status },
    });
    return saved;
  }

  async remove(id: string, actor?: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { vendorId: id },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    await this.auditService.log('vendor.deleted', {
      actor,
      entityType: 'vendor',
      entityId: vendor.vendorId,
      details: { vendorName: vendor.vendorName },
    });
    await this.vendorRepository.remove(vendor);
    return { deleted: true, id };
  }
}
