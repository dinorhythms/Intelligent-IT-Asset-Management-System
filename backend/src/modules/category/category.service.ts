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
import { CategoryEntity } from './category.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(status?: string) {
    const where = status ? { status } : {};
    return this.categoryRepository.find({
      where,
      order: { categoryName: 'ASC' },
    });
  }

  async findOne(id: string) {
    return this.categoryRepository.findOne({ where: { categoryId: id } });
  }

  async create(body: any, actor?: string) {
    if (!body.categoryName || !String(body.categoryName).trim()) {
      throw new BadRequestException('Category name is required');
    }
    const categoryName = String(body.categoryName).trim();
    const existing = await this.categoryRepository.findOne({
      where: { categoryName },
    });
    if (existing) {
      throw new ConflictException('A category with that name already exists');
    }

    const category = this.categoryRepository.create({
      categoryId: body.categoryId || randomUUID(),
      categoryName,
      description: body.description,
      status: body.status || 'active',
    }) as unknown as CategoryEntity;
    const saved = await this.categoryRepository.save(category);
    await this.auditService.log('category.created', {
      actor,
      entityType: 'category',
      entityId: saved.categoryId,
      details: { categoryName: saved.categoryName, status: saved.status },
    });
    return saved;
  }

  async update(id: string, body: any, actor?: string) {
    const category = await this.categoryRepository.findOne({
      where: { categoryId: id },
    });
    if (!category) throw new NotFoundException('Category not found');

    if (body.categoryId && body.categoryId !== category.categoryId) {
      throw new BadRequestException(
        'Category ID is immutable and cannot be changed',
      );
    }
    if (body.categoryName && body.categoryName !== category.categoryName) {
      const taken = await this.categoryRepository.findOne({
        where: { categoryName: body.categoryName },
      });
      if (taken && taken.id !== category.id) {
        throw new ConflictException('A category with that name already exists');
      }
      category.categoryName = String(body.categoryName).trim();
    }
    if (body.description !== undefined) category.description = body.description;
    if (body.status !== undefined) category.status = body.status;

    const saved = await this.categoryRepository.save(category);
    await this.auditService.log('category.updated', {
      actor,
      entityType: 'category',
      entityId: saved.categoryId,
      details: { categoryName: saved.categoryName, status: saved.status },
    });
    return saved;
  }

  async remove(id: string, actor?: string) {
    const category = await this.categoryRepository.findOne({
      where: { categoryId: id },
    });
    if (!category) throw new NotFoundException('Category not found');
    await this.auditService.log('category.deleted', {
      actor,
      entityType: 'category',
      entityId: category.categoryId,
      details: { categoryName: category.categoryName },
    });
    await this.categoryRepository.remove(category);
    return { deleted: true, id };
  }
}
