import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { UserEntity } from '../auth/user.entity';

export const ALLOWED_ROLES = ['admin', 'technician', 'staff'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly auditService: AuditService,
  ) {}

  private sanitize(user: UserEntity) {
    if (!user) return null;
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async findAll() {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.sanitize(user));
  }

  async findById(id: number) {
    const user = await this.userRepository.findOne({ where: { id } });
    return this.sanitize(user);
  }

  async findByUsername(username: string) {
    const user = await this.userRepository.findOne({
      where: { username },
    });
    return user;
  }

  async create(payload: any, actor?: string) {
    const role = payload.role || 'staff';
    if (!ALLOWED_ROLES.includes(role)) {
      throw new BadRequestException(
        `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      );
    }
    if (!payload.email && !payload.username) {
      throw new BadRequestException('Email or username is required');
    }

    let username = payload.username;
    if (!username && payload.email) {
      username = payload.email
        .toLowerCase()
        .split('@')[0]
        .replace(/[^a-z0-9_.-]/g, '');
    }
    if (!username) {
      throw new BadRequestException('A unique username is required');
    }

    const existing = await this.userRepository.findOne({
      where: [{ username }, { email: payload.email }],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === payload.email && payload.email
          ? 'A user with that email already exists'
          : 'A user with that username already exists',
      );
    }

    const passwordHash = await bcrypt.hash(payload.password || 'password123', 10);
    const user = this.userRepository.create({
      username,
      email: payload.email || null,
      firstName: payload.firstName,
      lastName: payload.lastName,
      otherNames: payload.otherNames,
      department: payload.department,
      location: payload.location,
      phoneNumber: payload.phoneNumber,
      passwordHash,
      role,
      loginStatus: 'active',
    });
    const saved = await this.userRepository.save(user);
    await this.auditService.log('user.created', {
      actor,
      entityType: 'user',
      entityId: String(saved.id),
      details: { username: saved.username, role: saved.role },
    });
    return this.sanitize(saved);
  }

  async update(id: number, payload: any, actor?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (payload.role && !ALLOWED_ROLES.includes(payload.role)) {
      throw new BadRequestException(
        `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      );
    }

    if (payload.email && payload.email !== user.email) {
      const taken = await this.userRepository.findOne({
        where: { email: payload.email },
      });
      if (taken && taken.id !== id) {
        throw new ConflictException('A user with that email already exists');
      }
    }

    Object.assign(user, {
      firstName: payload.firstName ?? user.firstName,
      lastName: payload.lastName ?? user.lastName,
      otherNames: payload.otherNames ?? user.otherNames,
      department: payload.department ?? user.department,
      location: payload.location ?? user.location,
      phoneNumber: payload.phoneNumber ?? user.phoneNumber,
      email: payload.email ?? user.email,
      role: payload.role ?? user.role,
    });

    if (payload.password) {
      user.passwordHash = await bcrypt.hash(payload.password, 10);
    }

    const saved = await this.userRepository.save(user);
    await this.auditService.log('user.updated', {
      actor,
      entityType: 'user',
      entityId: String(saved.id),
      details: { username: saved.username, role: saved.role },
    });
    return this.sanitize(saved);
  }

  async remove(id: number, actor?: string) {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.auditService.log('user.deleted', {
      actor,
      entityType: 'user',
      entityId: String(id),
      details: { username: user.username },
    });
    await this.userRepository.remove(user);
    return { deleted: true, id };
  }
}
