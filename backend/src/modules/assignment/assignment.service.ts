import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AssetEntity } from '../asset/asset.entity';
import {
  ASSET_STATUS_ASSIGNED,
  ASSET_STATUS_AVAILABLE,
} from '../asset/asset.service';
import { AuditService } from '../audit/audit.service';
import { UserEntity } from '../auth/user.entity';
import { MailerService } from '../mailer/mailer.service';
import { AssignmentEntity } from './assignment.entity';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly auditService: AuditService,
    private readonly mailerService: MailerService,
  ) {}

  private displayName(user: UserEntity | null) {
    if (!user) return undefined;
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return full || user.username;
  }

  private async enrich(assignment: AssignmentEntity) {
    const asset = await this.assetRepository
      .findOne({ where: { assetId: assignment.assetId } })
      .catch(() => null);
    const user = assignment.userId
      ? await this.userRepository
          .findOne({ where: { id: assignment.userId } })
          .catch(() => null)
      : null;
    return {
      ...assignment,
      asset: asset
        ? {
            assetId: asset.assetId,
            assetName: asset.assetName,
            category: asset.category,
            make: asset.make,
            model: asset.model,
            serialNumber: asset.serialNumber,
            assetStatus: asset.assetStatus,
            qrCodeUrl: asset.qrCodeUrl,
          }
        : null,
      user: user
        ? {
            id: user.id,
            username: user.username,
            name: this.displayName(user),
            email: user.email,
            department: user.department,
            location: user.location,
            phoneNumber: user.phoneNumber,
            role: user.role,
          }
        : null,
    };
  }

  async findAll(status?: string) {
    const where = status ? { status } : undefined;
    const list = await this.assignmentRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return Promise.all(list.map((item) => this.enrich(item)));
  }

  async findAllMine(username: string) {
    const list = await this.assignmentRepository.find({
      where: { userName: username },
      order: { createdAt: 'DESC' },
    });
    return Promise.all(list.map((item) => this.enrich(item)));
  }

  async create(payload: any, actor?: string) {
    const { assetId, userId, username, notes } = payload || {};

    const asset = await this.assetRepository.findOne({
      where: { assetId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.assetStatus === ASSET_STATUS_ASSIGNED) {
      throw new BadRequestException(
        'This asset is already assigned and cannot be assigned again until it is returned.',
      );
    }

    let user: UserEntity | null = null;
    if (userId) {
      user = await this.userRepository.findOne({ where: { id: userId } });
    } else if (username) {
      user = await this.userRepository.findOne({ where: { username } });
    }
    if (!user) throw new NotFoundException('User not found');

    const assignment = this.assignmentRepository.create({
      assignmentId: randomUUID(),
      assetId: asset.assetId,
      assetName: asset.assetName,
      userId: user.id,
      userName: user.username,
      userDisplayName: this.displayName(user),
      department: user.department,
      assignedBy: actor,
      status: 'assigned',
      notes: notes || undefined,
    });
    const saved = await this.assignmentRepository.save(assignment);

    asset.assetStatus = ASSET_STATUS_ASSIGNED;
    await this.assetRepository.save(asset);

    await this.auditService.log('assignment.created', {
      actor,
      entityType: 'assignment',
      entityId: String(saved.assignmentId || saved.id),
      details: { assetId: asset.assetId, userName: user.username },
    });

    void this.mailerService.sendToUserByName(
      user.username,
      'Asset assigned to you',
      [
        `Asset "${asset.assetName || asset.assetId}" (${asset.assetId}) has been assigned to you.`,
        `Assignment reference: ${saved.assignmentId || saved.id}`,
        `Assigned by: ${actor || 'Administrator'}`,
        user.department ? `Department: ${user.department}` : '',
        'Please contact your administrator if you have any questions.',
      ].filter(Boolean),
    );

    return this.enrich(saved);
  }

  async returnAsset(id: number, actor?: string) {
    const assignment = await this.assignmentRepository.findOne({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (assignment.status === 'returned') {
      throw new BadRequestException('This asset has already been returned');
    }

    assignment.status = 'returned';
    assignment.returnedAt = new Date();
    const saved = await this.assignmentRepository.save(assignment);

    const asset = await this.assetRepository.findOne({
      where: { assetId: assignment.assetId },
    });
    if (asset) {
      asset.assetStatus = ASSET_STATUS_AVAILABLE;
      await this.assetRepository.save(asset);
    }

    await this.auditService.log('assignment.returned', {
      actor,
      entityType: 'assignment',
      entityId: String(assignment.assignmentId || id),
      details: { assetId: assignment.assetId, userName: assignment.userName },
    });

    void this.mailerService.sendToUserByName(
      assignment.userName,
      'Asset return confirmed',
      [
        `Asset "${assignment.assetName || assignment.assetId}" (${assignment.assetId}) has been returned and is now available.`,
        `Returned on: ${new Date().toLocaleString()}`,
        actor ? `Processed by: ${actor}` : '',
        'Thank you.',
      ].filter(Boolean),
    );

    return this.enrich(saved);
  }

  async assignRequestAsset(
    assetId: string,
    username: string,
    actor?: string,
  ) {
    try {
      return await this.create({ assetId, username }, actor);
    } catch (error) {
      return { skipped: true, message: (error as Error).message };
    }
  }
}
