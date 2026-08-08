import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { Repository } from 'typeorm';
import { AiService } from '../ai/ai.service';
import { AiResultEntity } from '../ai/ai-result.entity';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AssignmentEntity } from '../assignment/assignment.entity';
import { AuditService } from '../audit/audit.service';
import { UserEntity } from '../auth/user.entity';
import { MailerService } from '../mailer/mailer.service';
import { ServiceEntity } from '../service/service.entity';
import { SettingsService } from '../settings/settings.service';
import { AssetEntity } from './asset.entity';

export const CATEGORY_PREFIXES: Record<string, string> = {
  laptop: 'LAPTOP',
  notebook: 'LAPTOP',
  computer: 'LAPTOP',
  printer: 'PRINTER',
  server: 'SERVER',
};

const ASSET_STATUS_AVAILABLE = 'Available';
const ASSET_STATUS_ASSIGNED = 'Assigned';
const ASSET_STATUS_RETURNED = 'Returned';
export { ASSET_STATUS_AVAILABLE, ASSET_STATUS_ASSIGNED, ASSET_STATUS_RETURNED };

export type LifecycleStatus = 'New' | 'Used';

export function computeLifecycleStatus(
  asset: { deliveryDate?: string | null; createdAt?: Date | string },
  serviceCount: number,
  assignmentCount: number,
): LifecycleStatus {
  if (serviceCount > 0) return 'Used';
  if (assignmentCount > 0) return 'Used';
  const start = asset?.deliveryDate || asset?.createdAt;
  if (start) {
    const startMs = new Date(start).getTime();
    if (!Number.isNaN(startMs)) {
      const months = (Date.now() - startMs) / (30.44 * 24 * 60 * 60 * 1000);
      if (months >= 6) return 'Used';
    }
  }
  return 'New';
}

function normalizeCategory(category?: string): string {
  return (category || '').trim().toLowerCase();
}

export function prefixForCategory(category?: string): string {
  const normalized = normalizeCategory(category);
  if (CATEGORY_PREFIXES[normalized]) return CATEGORY_PREFIXES[normalized];
  if (normalized) {
    return normalized.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase() || 'ASSET';
  }
  return 'ASSET';
}

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectRepository(AssetEntity)
    private readonly assetRepository: Repository<AssetEntity>,
    @InjectRepository(PredictiveResultEntity)
    private readonly predictiveRepository: Repository<PredictiveResultEntity>,
    @InjectRepository(AiResultEntity)
    private readonly aiResultRepository: Repository<AiResultEntity>,
    @InjectRepository(AssignmentEntity)
    private readonly assignmentRepository: Repository<AssignmentEntity>,
    @InjectRepository(ServiceEntity)
    private readonly serviceRepository: Repository<ServiceEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly aiService: AiService,
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
    private readonly mailerService: MailerService,
  ) {}

  private toQrUrl(baseUrl: string, uniqueId: string): string {
    return `${baseUrl.replace(/\/$/, '')}/view/${uniqueId}`;
  }

  async buildQr(asset: AssetEntity): Promise<{ qrCode: string; qrCodeUrl: string }> {
    const baseUrl = await this.settingsService.getQrBaseUrl();
    const qrCodeUrl = this.toQrUrl(baseUrl, asset.uniqueId || asset.assetId);
    const qrCode = await QRCode.toDataURL(qrCodeUrl);
    return { qrCode, qrCodeUrl };
  }

  async nextAssetId(category?: string): Promise<string> {
    const prefix = prefixForCategory(category);
    const assets = await this.assetRepository
      .createQueryBuilder('asset')
      .where('asset.assetId LIKE :pattern', { pattern: `${prefix}-%` })
      .getMany();
    let max = 0;
    for (const asset of assets) {
      const match = asset.assetId.match(new RegExp(`^${prefix}-(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > max) max = num;
      }
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  async findAll(status?: string, category?: string) {
    const where: Record<string, string> = {};
    if (status) where.assetStatus = status;
    if (category) where.category = category;
    const list = await this.assetRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const enriched = await this.attachLifecycle(list);
    return Promise.all(
      enriched.map(async (asset) => {
        if (!asset.qrCode || !asset.qrCodeUrl) {
          const qr = await this.buildQr(asset);
          asset.qrCode = qr.qrCode;
          asset.qrCodeUrl = qr.qrCodeUrl;
        }
        return asset;
      }),
    );
  }

  async findOne(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    if (!asset.qrCode || !asset.qrCodeUrl) {
      const qr = await this.buildQr(asset);
      asset.qrCode = qr.qrCode;
      asset.qrCodeUrl = qr.qrCodeUrl;
    }
    const enriched = await this.enrichWithAssignment(asset);
    return {
      ...enriched,
      lifecycleStatus: await this.lifecycleFor(asset),
    };
  }

  async findOneByUniqueId(uniqueId: string) {
    const asset = await this.assetRepository.findOne({
      where: { uniqueId },
    });
    if (!asset) return null;
    const resolved = await this.findOne(asset.assetId);
    return resolved;
  }

  private async enrichWithAssignment(asset: AssetEntity) {
    const assignment = await this.assignmentRepository
      .findOne({
        where: { assetId: asset.assetId, status: 'assigned' },
        order: { assignedAt: 'DESC' },
      })
      .catch(() => null);
    if (!assignment) return asset;
    const user = assignment.userId
      ? await this.userRepository
          .findOne({ where: { id: assignment.userId } })
          .catch(() => null)
      : null;
    return {
      ...asset,
      currentAssignment: {
        id: assignment.id,
        assignedTo: assignment.userDisplayName || assignment.userName,
        username: assignment.userName,
        department: assignment.department,
        email: user?.email || null,
        assignedBy: assignment.assignedBy,
        assignedAt: assignment.assignedAt,
        notes: assignment.notes,
      },
    };
  }

  async findByAssignedUser(userId: string) {
    const assignments = await this.assignmentRepository.find({
      where: { userId, status: 'assigned' },
      order: { assignedAt: 'DESC' },
    });
    return Promise.all(
      assignments.map(async (assignment) => {
        const asset = await this.assetRepository
          .findOne({ where: { assetId: assignment.assetId } })
          .catch(() => null);
        return {
          assignmentId: assignment.id,
          assetId: assignment.assetId,
          assetName: assignment.assetName || asset?.assetName,
          category: asset?.category,
          make: asset?.make,
          model: asset?.model,
          serialNumber: asset?.serialNumber,
          assetStatus: asset?.assetStatus,
          lifecycleStatus: asset ? await this.lifecycleFor(asset) : null,
          qrCodeUrl: asset?.qrCodeUrl,
          predictiveScore: asset?.predictiveScore,
          scoreEstimated: asset?.scoreEstimated,
          assignedAt: assignment.assignedAt,
          notes: assignment.notes,
        };
      }),
    );
  }

  async findMine(username: string) {
    const assignments = await this.assignmentRepository.find({
      where: { userName: username, status: 'assigned' },
      order: { assignedAt: 'DESC' },
    });
    return Promise.all(
      assignments.map(async (assignment) => {
        const asset = await this.assetRepository
          .findOne({ where: { assetId: assignment.assetId } })
          .catch(() => null);
        return {
          assignmentId: assignment.id,
          assetId: assignment.assetId,
          assetName: assignment.assetName || asset?.assetName,
          category: asset?.category,
          make: asset?.make,
          model: asset?.model,
          serialNumber: asset?.serialNumber,
          assetStatus: asset?.assetStatus,
          lifecycleStatus: asset ? await this.lifecycleFor(asset) : null,
          qrCodeUrl: asset?.qrCodeUrl,
          predictiveScore: asset?.predictiveScore,
          scoreEstimated: asset?.scoreEstimated,
          assignedAt: assignment.assignedAt,
          assignedBy: assignment.assignedBy,
          notes: assignment.notes,
        };
      }),
    );
  }

  async create(body: any, user?: any) {
    const category = body.category || body.assetType || 'asset';
    const make = body.make || body.manufacturer || '';
    const model = body.model || '';
    const assetId = randomUUID();
    const uniqueId = randomUUID();
    const qr = await this.buildQr({ uniqueId } as AssetEntity);

    let receivedById = body.receivedById || null;
    let receivedBy = body.receivedBy || user?.username || 'system';
    if (!receivedById) {
      throw new BadRequestException(
        'Received By is required. Select the staff member who received the asset.',
      );
    }
    const receiver = await this.userRepository
      .findOne({ where: { id: receivedById } })
      .catch(() => null);
    if (!receiver) {
      throw new BadRequestException(
        'The selected receiver is not a registered user',
      );
    }
    receivedBy =
      [receiver.firstName, receiver.lastName].filter(Boolean).join(' ') ||
      receiver.username;

    const asset = this.assetRepository.create({
      ...body,
      assetId,
      uniqueId,
      category,
      make,
      model,
      assetName: body.assetName || [make, model].filter(Boolean).join(' ') || 'New Asset',
      assetStatus: body.assetStatus || ASSET_STATUS_AVAILABLE,
      assetLifecycle: body.assetLifecycle || 'procurement',
      predictiveScore: body.predictiveScore ?? 0.35,
      dashboardView: body.dashboardView !== false,
      qrCode: qr.qrCode,
      qrCodeUrl: qr.qrCodeUrl,
      receivedById,
      receivedBy,
      vendorId: body.vendorId,
      cost: body.cost === undefined || body.cost === null || body.cost === ''
        ? undefined
        : Number(body.cost),
      usageHours: body.usage_hours ?? body.usageHours,
      temperature: body.temperature,
      cpuUsage: body.cpu_usage ?? body.cpuUsage,
      vibration: body.vibration,
      loadFactor: body.load_factor ?? body.loadFactor,
      yearsOperation: body.years_operation ?? body.yearsOperation,
      nextMaintenanceDate: body.next_maintenance_date ?? body.nextMaintenanceDate,
    }) as unknown as AssetEntity;
    const saved = await this.assetRepository.save(asset);
    await this.auditService.log('asset.created', {
      actor: user?.username,
      entityType: 'asset',
      entityId: saved.assetId,
      details: { category, assetName: saved.assetName, qrCodeUrl: saved.qrCodeUrl },
    });
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async update(id: string, body: any, user?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    if (body.assetId && body.assetId !== asset.assetId) {
      throw new BadRequestException(
        'Asset ID is immutable and cannot be changed',
      );
    }

    const category = body.category || body.assetType || asset.category || asset.assetType || 'asset';
    const make = body.make || body.manufacturer || asset.make || asset.manufacturer || '';
    const model = body.model || asset.model || '';

    const { assetId, id: rowId, uniqueId, qrCode, qrCodeUrl, createdAt, updatedAt, ...editable } = body;
    Object.assign(asset, editable);
    asset.category = category;
    asset.make = make;
    asset.model = model;
    asset.assetName = body.assetName || [make, model].filter(Boolean).join(' ') || asset.assetName;
    asset.assetStatus = body.assetStatus || asset.assetStatus;
    asset.vendor = body.vendor ?? asset.vendor;
    asset.vendorId = body.vendorId ?? asset.vendorId;
    if (body.receivedById !== undefined) {
      const receiver = await this.userRepository
        .findOne({ where: { id: body.receivedById } })
        .catch(() => null);
      if (receiver) {
        asset.receivedById = receiver.id;
        asset.receivedBy =
          [receiver.firstName, receiver.lastName].filter(Boolean).join(' ') ||
          receiver.username;
      }
    }
    asset.cost =
      body.cost === undefined || body.cost === null || body.cost === ''
        ? asset.cost
        : Number(body.cost);
    asset.usageHours = body.usage_hours ?? body.usageHours ?? asset.usageHours;
    asset.temperature = body.temperature ?? asset.temperature;
    asset.cpuUsage = body.cpu_usage ?? body.cpuUsage ?? asset.cpuUsage;
    asset.vibration = body.vibration ?? asset.vibration;
    asset.loadFactor = body.load_factor ?? body.loadFactor ?? asset.loadFactor;
    asset.yearsOperation = body.years_operation ?? body.yearsOperation ?? asset.yearsOperation;
    asset.nextMaintenanceDate = body.next_maintenance_date ?? body.nextMaintenanceDate ?? asset.nextMaintenanceDate;

    if (!asset.uniqueId) {
      asset.uniqueId = randomUUID();
    }
    const qr = await this.buildQr(asset);
    asset.qrCode = qr.qrCode;
    asset.qrCodeUrl = qr.qrCodeUrl;

    const saved = await this.assetRepository.save(asset);
    await this.auditService.log('asset.updated', {
      actor: user?.username,
      entityType: 'asset',
      entityId: saved.assetId,
      details: { category },
    });
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async remove(id: string, user?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (asset) {
      await this.auditService.log('asset.deleted', {
        actor: user?.username,
        entityType: 'asset',
        entityId: asset.assetId,
      });
      await this.assetRepository.remove(asset);
    }
    return { deleted: true, id };
  }

  async regenerateAllQrCodes() {
    const assets = await this.assetRepository.find();
    let updated = 0;
    for (const asset of assets) {
      if (!asset.uniqueId) asset.uniqueId = randomUUID();
      const qr = await this.buildQr(asset);
      asset.qrCode = qr.qrCode;
      asset.qrCodeUrl = qr.qrCodeUrl;
      await this.assetRepository.save(asset);
      updated++;
    }
    return { updated, qrBaseUrl: await this.settingsService.getQrBaseUrl() };
  }

  scan(body: any) {
    return {
      scanned: true,
      assetIdentifier: body.assetIdentifier || 'AST-1001',
      recognized: true,
    };
  }

  private yearsFromDates(asset: AssetEntity): number {
    const start = asset.deliveryDate || asset.createdAt;
    if (!start) return 0;
    const startMs = new Date(start).getTime();
    if (Number.isNaN(startMs)) return 0;
    return Math.max(0, (Date.now() - startMs) / (365.25 * 24 * 60 * 60 * 1000));
  }

  private async lifecycleFor(asset: AssetEntity): Promise<LifecycleStatus> {
    const [serviceCount, assignmentCount] = await Promise.all([
      this.serviceRepository
        .count({ where: { assetId: asset.assetId } })
        .catch(() => 0),
      this.assignmentRepository
        .count({ where: { assetId: asset.assetId } })
        .catch(() => 0),
    ]);
    return computeLifecycleStatus(asset, serviceCount, assignmentCount);
  }

  private async attachLifecycle(
    assets: AssetEntity[],
  ): Promise<(AssetEntity & { lifecycleStatus: LifecycleStatus | null })[]> {
    if (assets.length === 0) return assets as any[];
    const ids = assets.map((asset) => asset.assetId);
    const [serviceRows, assignmentRows] = await Promise.all([
      this.serviceRepository
        .createQueryBuilder('service')
        .select('service.assetId', 'assetId')
        .addSelect('COUNT(*)', 'count')
        .where('service.assetId IN (:...ids)', { ids })
        .groupBy('service.assetId')
        .getRawMany()
        .catch(() => [] as any[]),
      this.assignmentRepository
        .createQueryBuilder('assignment')
        .select('assignment.assetId', 'assetId')
        .addSelect('COUNT(*)', 'count')
        .where('assignment.assetId IN (:...ids)', { ids })
        .groupBy('assignment.assetId')
        .getRawMany()
        .catch(() => [] as any[]),
    ]);
    const serviceCounts = new Map<string, number>(
      serviceRows.map((row) => [row.assetId, Number(row.count) || 0]),
    );
    const assignmentCounts = new Map<string, number>(
      assignmentRows.map((row) => [row.assetId, Number(row.count) || 0]),
    );
    return assets.map((asset) => ({
      ...asset,
      lifecycleStatus: computeLifecycleStatus(
        asset,
        serviceCounts.get(asset.assetId) || 0,
        assignmentCounts.get(asset.assetId) || 0,
      ),
    }));
  }

  private ageYears(asset: AssetEntity): number {
    return this.yearsFromDates(asset);
  }

  private async lastServiceFor(assetId: string) {
    return this.serviceRepository
      .findOne({
        where: { assetId },
        order: { serviceDate: 'DESC' },
      })
      .catch(() => null);
  }

  private warrantyStatus(asset: AssetEntity): string {
    const text = (asset.warranty || '').trim().toLowerCase();
    if (!text) return 'N/A';
    if (text.includes('expired') || text.includes('no warranty')) {
      return 'Expired';
    }
    if (text.includes('lifetime') || text.includes('ltd')) return 'Active';
    const startMs = asset.deliveryDate
      ? new Date(asset.deliveryDate).getTime()
      : Date.now();
    if (Number.isNaN(startMs)) return 'Active';
    let months = 0;
    const yearsMatch = text.match(/(\d+)\s*(?:years?|yrs?)/);
    const monthsMatch = text.match(/(\d+)\s*(?:months?|mos?)/);
    if (yearsMatch) months += parseInt(yearsMatch[1], 10) * 12;
    if (monthsMatch) months += parseInt(monthsMatch[1], 10);
    if (months > 0) {
      const expiry = startMs + months * 30.44 * 24 * 60 * 60 * 1000;
      return Date.now() > expiry ? 'Expired' : 'Active';
    }
    return 'Active';
  }

  async findAvailable(category?: string) {
    const where: Record<string, string> = { assetStatus: ASSET_STATUS_AVAILABLE };
    if (category) where.category = category;
    const list = await this.assetRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    const enriched = await this.attachLifecycle(list);
    return Promise.all(
      enriched.map(async (asset) => {
        const [lastService, receiver] = await Promise.all([
          this.lastServiceFor(asset.assetId),
          asset.receivedById
            ? this.userRepository
                .findOne({ where: { id: asset.receivedById } })
                .catch(() => null)
            : null,
        ]);
        return {
          assetId: asset.assetId,
          uniqueId: asset.uniqueId,
          assetName: asset.assetName,
          category: asset.category,
          make: asset.make,
          model: asset.model,
          serialNumber: asset.serialNumber,
          assetStatus: asset.assetStatus,
          lifecycleStatus: asset.lifecycleStatus,
          condition: asset.condition,
          ageYears: Math.round(this.ageYears(asset) * 10) / 10,
          deliveryDate: asset.deliveryDate,
          department: receiver?.department || null,
          lastServiceDate: lastService?.serviceDate || null,
        };
      }),
    );
  }

  async findDetails(id: string, role?: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    const services = await this.serviceRepository
      .find({
        where: { assetId: asset.assetId },
        order: { serviceDate: 'DESC' },
      })
      .catch(() => []);
    const lastService = services[0] || null;
    const receiver = asset.receivedById
      ? await this.userRepository
          .findOne({ where: { id: asset.receivedById } })
          .catch(() => null)
      : null;
    const lifecycleStatus = await this.lifecycleFor(asset);
    const isStaff = String(role || '').toLowerCase() === 'staff';

    if (isStaff) {
      return {
        id: asset.id,
        assetId: asset.assetId,
        uniqueId: asset.uniqueId,
        assetName: asset.assetName,
        category: asset.category,
        make: asset.make,
        model: asset.model,
        department: receiver?.department || null,
        assetStatus: asset.assetStatus,
        lifecycleStatus,
        condition: asset.condition,
        predictiveScore: asset.predictiveScore,
        riskBand: this.riskBand(asset.predictiveScore),
        restricted: true,
      };
    }

    return {
      id: asset.id,
      assetId: asset.assetId,
      uniqueId: asset.uniqueId,
      assetName: asset.assetName,
      category: asset.category,
      make: asset.make,
      model: asset.model,
      serialNumber: asset.serialNumber,
      macAddress: asset.macAddress,
      vendor: asset.vendor,
      vendorId: asset.vendorId,
      manufacturer: asset.manufacturer,
      receivedBy: asset.receivedBy,
      department: receiver?.department || null,
      cost: asset.cost,
      deliveryDate: asset.deliveryDate,
      warranty: asset.warranty,
      warrantyStatus: this.warrantyStatus(asset),
      assetStatus: asset.assetStatus,
      lifecycleStatus,
      condition: asset.condition,
      notes: asset.notes || null,
      serviceHistory: {
        count: services.length,
        lastServiceDate: lastService?.serviceDate || null,
        lastServiceDesc: lastService?.serviceDesc || null,
      },
    };
  }

  private async roleLabel(username?: string): Promise<string> {
    if (!username) return 'A user';
    const actor = await this.userRepository
      .findOne({ where: { username } })
      .catch(() => null);
    if (!actor) return username;
    const label = (actor.role || 'staff').toLowerCase();
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  async findAssignments(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    const assignments = await this.assignmentRepository.find({
      where: { assetId: asset.assetId },
      order: { assignedAt: 'DESC' },
    });
    return Promise.all(
      assignments.map(async (assignment) => {
        const user = assignment.userId
          ? await this.userRepository
              .findOne({ where: { id: assignment.userId } })
              .catch(() => null)
          : null;
        return {
          id: assignment.id,
          assignmentId: assignment.assignmentId,
          assignedTo:
            assignment.userDisplayName ||
            [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
            assignment.userName,
          userName: assignment.userName,
          department: assignment.department || user?.department || null,
          assignedDate: assignment.assignedAt,
          returnedDate: assignment.returnedAt,
          status: assignment.status,
          returnInitiatedBy: assignment.returnInitiatedBy || null,
          returnInitiatedAt: assignment.returnInitiatedAt || null,
          returnReason: assignment.returnReason || null,
          returnConfirmedBy: assignment.returnConfirmedBy || null,
          returnConfirmedAt: assignment.returnConfirmedAt || null,
        };
      }),
    );
  }

  async initiateReturn(id: string, user?: any, body?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    const assignment = await this.assignmentRepository
      .findOne({
        where: { assetId: asset.assetId, status: 'assigned' },
        order: { assignedAt: 'DESC' },
      })
      .catch(() => null);
    if (!assignment) {
      throw new BadRequestException(
        'This asset is not currently assigned, so a return cannot be initiated.',
      );
    }
    const actor = user?.username || 'Staff';
    assignment.returnInitiatedBy = actor;
    assignment.returnInitiatedAt = new Date();
    assignment.returnReason = body?.reason || null;
    await this.assignmentRepository.save(assignment);

    asset.assetStatus = 'Pending Return';
    await this.assetRepository.save(asset);

    const role = await this.roleLabel(actor);
    await this.auditService.log('return.initiated', {
      actor,
      entityType: 'asset',
      entityId: asset.assetId,
      description: `${role} initiated return of asset ${asset.assetName || asset.assetId}.`,
      details: {
        assetName: asset.assetName || asset.assetId,
        reason: body?.reason || '',
        initiatedAt: assignment.returnInitiatedAt,
      },
    });

    void this.mailerService.sendToAdminAndTechnicians(
      'Asset return requested',
      [
        `${role} has requested to return asset "${asset.assetName || asset.assetId}" (${asset.assetId}).`,
        `Assigned to: ${assignment.userDisplayName || assignment.userName || '—'}`,
        assignment.returnReason ? `Reason: ${assignment.returnReason}` : 'Reason: Not provided.',
        'Review and confirm the return from the asset details page.',
        `Asset details: ${await this.settingsService.getQrBaseUrl()}/assets/${asset.assetId}`,
      ],
    );

    return {
      asset: { ...asset, lifecycleStatus: await this.lifecycleFor(asset) },
      assignment,
    };
  }

  async confirmReturn(id: string, user?: any, body?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) throw new NotFoundException('Asset not found');

    const assignments = await this.assignmentRepository
      .find({
        where: { assetId: asset.assetId },
        order: { assignedAt: 'DESC' },
      })
      .catch(() => []);
    const confirmed =
      assignments.find((item) => item.status === 'assigned') ||
      assignments.find((item) => Boolean(item.returnInitiatedAt)) ||
      assignments[0];

    if (!confirmed) {
      throw new BadRequestException(
        'No assignment found for this asset to confirm a return on.',
      );
    }

    const actor = user?.username || 'Admin';
    confirmed.status = 'returned';
    confirmed.returnedAt = new Date();
    confirmed.returnConfirmedBy = actor;
    confirmed.returnConfirmedAt = new Date();
    await this.assignmentRepository.save(confirmed);

    const destination = (body?.destination || body?.status || '').toLowerCase();
    asset.assetStatus =
      destination === 'maintenance' || destination === 'in service'
        ? 'In Service'
        : ASSET_STATUS_AVAILABLE;
    await this.assetRepository.save(asset);

    const role = await this.roleLabel(actor);
    await this.auditService.log('return.confirmed', {
      actor,
      entityType: 'asset',
      entityId: asset.assetId,
      description: `${confirmed.returnInitiatedBy || 'A user'} initiated return of asset ${asset.assetName || asset.assetId}, confirmed by ${role}.`,
      details: {
        assetName: asset.assetName || asset.assetId,
        destination: asset.assetStatus,
        initiatedBy: confirmed.returnInitiatedBy || null,
        confirmedAt: confirmed.returnConfirmedAt,
        reason: confirmed.returnReason || '',
      },
    });

    void this.mailerService.sendToUserByName(
      confirmed.userName,
      'Asset return confirmed',
      [
        `The return of asset "${asset.assetName || asset.assetId}" (${asset.assetId}) has been confirmed.`,
        `Status: ${asset.assetStatus}.`,
        confirmed.returnReason ? `Reason: ${confirmed.returnReason}` : '',
        actor ? `Confirmed by: ${actor}` : '',
        'Thank you.',
      ].filter(Boolean),
    );

    return {
      asset: { ...asset, lifecycleStatus: await this.lifecycleFor(asset) },
      assignment: confirmed,
    };
  }

  async findReturns(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    const assignments = await this.assignmentRepository.find({
      where: { assetId: asset.assetId },
      order: { assignedAt: 'DESC' },
    });
    return assignments
      .filter(
        (assignment) =>
          assignment.status === 'returned' ||
          Boolean(assignment.returnInitiatedAt),
      )
      .map((assignment) => ({
        assignmentId: assignment.assignmentId,
        assetName: asset.assetName || asset.assetId,
        initiatedBy: assignment.returnInitiatedBy || null,
        initiatedAt: assignment.returnInitiatedAt || null,
        reason: assignment.returnReason || null,
        confirmedBy: assignment.returnConfirmedBy || null,
        confirmedAt: assignment.returnConfirmedAt || null,
        returnedAt: assignment.returnedAt || null,
        status: assignment.status,
      }));
  }

  private riskBand(score: number | null | undefined): 'low' | 'medium' | 'high' {
    const value = Number(score);
    if (Number.isNaN(value)) return 'low';
    if (value < 0.4) return 'low';
    if (value <= 0.7) return 'medium';
    return 'high';
  }

  async findAnalysis(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;

    const [predictiveResults, aiEvents] = await Promise.all([
      this.predictiveRepository
        .find({ where: { assetId: asset.assetId }, order: { createdAt: 'ASC' } })
        .catch(() => []),
      this.aiResultRepository
        .find({
          where: { assetId: asset.assetId },
          order: { createdAt: 'ASC' },
        })
        .catch(() => []),
    ]);

    const riskTrend = predictiveResults.map((result) => ({
      date: result.createdAt,
      score: Number(result.predictiveScore) || 0,
    }));

    const rulCurve = aiEvents
      .filter((event) => event.kind === 'predict')
      .map((event) => ({
        date: event.createdAt,
        rulDays: Number(event.responsePayload?.rul_days) || null,
        score: Number(event.responsePayload?.predictive_score) || null,
      }));

    const anomalyEvents = aiEvents.filter(
      (event) =>
        event.kind === 'anomaly' && Boolean(event.responsePayload?.anomaly_detected),
    );

    const anomalyByDate: Record<string, number> = {};
    for (const event of anomalyEvents) {
      const key = new Date(event.createdAt).toISOString().slice(0, 10);
      anomalyByDate[key] = (anomalyByDate[key] || 0) + 1;
    }
    const anomalyFrequency = Object.entries(anomalyByDate).map(
      ([date, count]) => ({ date, count }),
    );

    const scores = riskTrend.map((point) => point.score);
    const currentScore =
      scores.length > 0 ? scores[scores.length - 1] : Number(asset.predictiveScore) || 0;
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100) /
          100
        : null;
    const trend =
      scores.length < 2
        ? 'stable'
        : scores[scores.length - 1] > scores[0]
          ? 'increasing'
          : scores[scores.length - 1] < scores[0]
            ? 'decreasing'
            : 'stable';

    const lastMaintenance = predictiveResults[predictiveResults.length - 1];

    return {
      asset: {
        assetId: asset.assetId,
        assetName: asset.assetName,
        lifecycleStatus: await this.lifecycleFor(asset),
        condition: asset.condition,
      },
      insights: {
        currentRisk: currentScore,
        riskBand: this.riskBand(currentScore),
        averageRisk: avgScore,
        trend,
        totalPredictions: predictiveResults.length,
        anomalyCount: anomalyEvents.length,
        anomalyFrequency,
        maintenanceForecast: lastMaintenance?.maintenanceForecast || null,
        nextMaintenanceDate: lastMaintenance?.nextMaintenanceDate || null,
        rulDays:
          rulCurve.length > 0
            ? rulCurve[rulCurve.length - 1].rulDays
            : null,
      },
      riskTrend,
      rulCurve,
      summary: [...predictiveResults].reverse().slice(0, 20).map((result) => ({
        id: result.id,
        date: result.createdAt,
        predictiveScore: Number(result.predictiveScore) || 0,
        riskBand: this.riskBand(Number(result.predictiveScore) || 0),
        maintenanceForecast: result.maintenanceForecast,
        anomalyDetected: Boolean(result.anomalyDetected),
        nextMaintenanceDate: result.nextMaintenanceDate,
        recommendedActions: result.recommendedActions || null,
      })),
    };
  }

  async findAiHistory(id: string, query?: { kind?: string; from?: string; to?: string; risk?: string }) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;

    const builder = this.aiResultRepository
      .createQueryBuilder('event')
      .where('event.assetId = :assetId', { assetId: asset.assetId })
      .andWhere('event.kind IN (:...kinds)', {
        kinds: ['predict', 'anomaly', 'maintenance_schedule'],
      });

    if (query?.kind) {
      builder.andWhere('event.kind = :kind', { kind: query.kind });
    }
    if (query?.from) {
      builder.andWhere('event.createdAt >= :from', { from: new Date(query.from) });
    }
    if (query?.to) {
      builder.andWhere('event.createdAt <= :to', { to: new Date(query.to) });
    }

    builder.orderBy('event.createdAt', 'DESC');

    const events = await builder.getMany().catch(() => []);
    const friendlyName = asset.assetName || asset.assetId;

    let result = events.map((event) => {
      const score =
        event.kind === 'predict'
          ? Number(event.responsePayload?.predictive_score)
          : null;
      return {
        id: event.id,
        kind: event.kind,
        assetId: event.assetId,
        assetName: friendlyName,
        riskBand: this.riskBand(score),
        createdAt: event.createdAt,
        requestPayload: event.requestPayload,
        responsePayload: event.responsePayload,
      };
    });

    if (query?.risk) {
      const band = query.risk.toLowerCase();
      result = result.filter((event) => event.riskBand === band);
    }

    return result;
  }

  async getValue(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;

    const cost = Number(asset.cost);
    if (!cost || cost <= 0) {
      return {
        assetId: asset.assetId,
        assetName: asset.assetName,
        cost: null,
        estimatedValue: null,
        recommendedAuctionValue: null,
        depreciationPercent: null,
        note: 'No purchase cost recorded for this asset. Add a cost to enable valuation.',
      };
    }

    let services: ServiceEntity[] = [];
    try {
      services = await this.serviceRepository.find({
        where: { assetId: asset.assetId },
      });
    } catch {
      services = [];
    }
    let serviceCost = 0;
    for (const service of services) {
      serviceCost += Number(service.cost) || 0;
    }
    const serviceCount = services.length;

    const yearsOperation =
      Number(asset.yearsOperation) || this.yearsFromDates(asset);
    const usageYears = (Number(asset.usageHours) || 0) / 8760;
    const effectiveYears = yearsOperation + usageYears;

    const annualDepreciationRate = 0.2;
    const salvageValue = Math.round(cost * 0.1 * 100) / 100;

    let estimatedValue = Math.max(
      cost * (1 - annualDepreciationRate * effectiveYears),
      salvageValue,
    );
    const careBoost = Math.min(0.05 * serviceCount, 0.1);
    estimatedValue = Math.round(estimatedValue * (1 + careBoost) * 100) / 100;

    const recommendedAuctionValue = Math.round(estimatedValue * 0.9 * 100) / 100;
    const depreciationPercent =
      Math.max(0, Math.round((1 - estimatedValue / cost) * 10000)) / 100;

    return {
      assetId: asset.assetId,
      assetName: asset.assetName,
      cost,
      serviceCost: Math.round(serviceCost * 100) / 100,
      serviceCount,
      estimatedValue,
      recommendedAuctionValue,
      depreciationPercent,
      salvageValue,
      basis: {
        effectiveYears: Math.round(effectiveYears * 10) / 10,
        annualDepreciationRate,
      },
    };
  }


  async predict(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    try {
      const payload = this.buildTelemetryPayload(asset, asset);
      const prediction = await this.aiService.predict(payload);
      const predictiveScore =
        Number(prediction.predictive_score) || asset.predictiveScore || 0.58;
      const maintenanceForecast = this.forecastFor(predictiveScore);
      const anomaly = await this.aiService
        .detectAnomaly(payload)
        .catch(() => ({ anomaly_detected: predictiveScore > 0.7 }));
      await this.assetRepository.update(
        { assetId: asset.assetId },
        { predictiveScore, scoreEstimated: false },
      );
      await this.saveSummary(
        asset.assetId,
        predictiveScore,
        maintenanceForecast,
        Boolean(anomaly?.anomaly_detected),
      );
      if (anomaly?.anomaly_detected || predictiveScore > 0.7) {
        void this.notifyRisk(
          asset,
          predictiveScore,
          Boolean(anomaly?.anomaly_detected),
        );
      }
      return {
        assetId: id,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected: Boolean(anomaly?.anomaly_detected),
        rulDays: prediction.rul_days,
        estimated: false,
      };
    } catch (error) {
      this.logger.warn(
        `[auto-ai] Predict for ${id} failed, using fallback score: ${
          (error as Error).message
        }`,
      );
      const predictiveScore = await this.computeFallbackScore(asset);
      const maintenanceForecast = this.forecastFor(predictiveScore);
      await this.assetRepository.update(
        { assetId: asset.assetId },
        { predictiveScore, scoreEstimated: true },
      );
      await this.saveSummary(
        asset.assetId,
        predictiveScore,
        maintenanceForecast,
        predictiveScore > 0.7,
      );
      return {
        assetId: id,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected: predictiveScore > 0.7,
        rulDays: null,
        fallback: true,
        estimated: true,
        message:
          'AI metrics incomplete — fallback risk score applied. Please update telemetry for accurate prediction.',
      };
    }
  }

  async getScore(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    const estimated = Boolean(asset.scoreEstimated);
    return {
      assetId: asset.assetId,
      assetName: asset.assetName,
      predictiveScore: asset.predictiveScore ?? null,
      estimated,
      maintenanceForecast: this.forecastFor(asset.predictiveScore ?? 0),
      message: estimated
        ? 'AI metrics incomplete — fallback risk score applied. Please update telemetry for accurate prediction.'
        : 'Predictive score computed by the AI service from live telemetry.',
    };
  }

  async getMetrics(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) return null;
    return {
      assetId: asset.assetId,
      assetName: asset.assetName,
      usageHours: asset.usageHours ?? null,
      temperature: asset.temperature ?? null,
      cpuUsage: asset.cpuUsage ?? null,
      vibration: asset.vibration ?? null,
      loadFactor: asset.loadFactor ?? null,
      yearsOperation: asset.yearsOperation ?? null,
      updatedAt: asset.updatedAt,
    };
  }

  async updateMetrics(id: string, body: any, user?: any) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    const telemetry = {
      usageHours: body.usage_hours ?? body.usageHours,
      temperature: body.temperature,
      cpuUsage: body.cpu_usage ?? body.cpuUsage,
      vibration: body.vibration,
      loadFactor: body.load_factor ?? body.loadFactor,
      yearsOperation: body.years_operation ?? body.yearsOperation,
    };
    Object.assign(asset, telemetry);
    const saved = await this.assetRepository.save(asset);
    await this.auditService.log('asset.metrics.updated', {
      actor: user?.username,
      entityType: 'asset',
      entityId: saved.assetId,
      details: { telemetry },
    });
    void this.refreshPredictiveData(saved, body);
    return saved;
  }

  async notifyMissingMetrics(id: string) {
    const asset = await this.assetRepository.findOne({
      where: { assetId: id },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    const result = await this.mailerService.sendToAdmins(
      `AI Metrics Missing for Asset ${asset.assetName ? `[${asset.assetName}]` : `[${asset.assetId}]`}`,
      [
        `Asset "${asset.assetName || asset.assetId}" (${asset.assetId}) has incomplete telemetry metrics, so the AI service cannot compute an accurate predictive score.`,
        `A fallback risk score was applied (${asset.predictiveScore ?? '—'}).`,
        'Please update the telemetry metrics (usage hours, temperature, CPU usage, vibration, load factor) for this asset to enable accurate AI prediction.',
        `Asset details: ${await this.settingsService.getQrBaseUrl()}/assets/${asset.assetId}`,
      ],
    );
    const delivered = Boolean((result as any)?.delivered);
    await this.auditService.log('asset.metrics.missing', {
      entityType: 'asset',
      entityId: asset.assetId,
      details: { notifiedAdmins: delivered },
    });
    return {
      notified: true,
      assetId: asset.assetId,
      email: result,
    };
  }

  private async computeFallbackScore(asset: AssetEntity): Promise<number> {
    const years =
      Number(asset.yearsOperation) || this.yearsFromDates(asset) || 1;
    const usageYears = (Number(asset.usageHours) || 0) / 8760;
    const effectiveYears = years + usageYears;

    let serviceCount = 0;
    try {
      serviceCount = await this.serviceRepository.count({
        where: { assetId: asset.assetId },
      });
    } catch {
      serviceCount = 0;
    }

    let score = 0.25;
    score += Math.min(effectiveYears * 0.12, 0.35);
    score += Math.min(serviceCount * 0.08, 0.2);
    score += Math.min((Number(asset.temperature) || 0) / 200, 0.15);
    score += Math.min((Number(asset.cpuUsage) || 0) / 200, 0.12);
    score += Math.min((Number(asset.vibration) || 0) / 10, 0.08);
    score += Math.min((Number(asset.loadFactor) || 0) / 2, 0.1);

    const categoryDefault: Record<string, number> = {
      server: 0.55,
      laptop: 0.45,
      computer: 0.45,
      printer: 0.5,
    };
    score +=
      categoryDefault[(asset.category || '').toLowerCase()] || 0.4;

    return Math.max(0, Math.min(1, score));
  }

  private forecastFor(score: number) {
    return score > 0.6 ? 'scheduled' : 'monitor';
  }

  private buildTelemetryPayload(asset: AssetEntity, body: any) {
    return {
      asset_id: asset.assetId,
      assetId: asset.assetId,
      usage_hours: body.usage_hours ?? body.usageHours ?? asset.usageHours,
      temperature: body.temperature ?? asset.temperature,
      cpu_usage: body.cpu_usage ?? body.cpuUsage ?? asset.cpuUsage,
      vibration: body.vibration ?? asset.vibration,
      load_factor: body.load_factor ?? body.loadFactor ?? asset.loadFactor,
      years_operation:
        body.years_operation ?? body.yearsOperation ?? asset.yearsOperation,
    };
  }

  private async saveSummary(
    assetId: string,
    predictiveScore: number,
    maintenanceForecast: string,
    anomalyDetected: boolean,
  ) {
    await this.predictiveRepository.save(
      this.predictiveRepository.create({
        assetId,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected,
      }),
    );
  }

  private async refreshPredictiveData(asset: AssetEntity, body: any) {
    try {
      const payload = this.buildTelemetryPayload(asset, body);
      const [prediction, anomaly] = await Promise.all([
        this.aiService.predict(payload),
        this.aiService.detectAnomaly(payload),
      ]);

      const predictiveScore =
        Number(prediction.predictive_score) || asset.predictiveScore || 0.35;
      const maintenanceForecast = this.forecastFor(predictiveScore);
      const anomalyDetected = Boolean(anomaly?.anomaly_detected);

      await this.assetRepository.update(
        { assetId: asset.assetId },
        { predictiveScore, scoreEstimated: false },
      );
      await this.saveSummary(
        asset.assetId,
        predictiveScore,
        maintenanceForecast,
        anomalyDetected,
      );

      if (anomalyDetected || predictiveScore > 0.7) {
        void this.notifyRisk(asset, predictiveScore, anomalyDetected);
      }

      this.logger.log(
        `[auto-ai] Asset ${asset.assetId} updated: predictiveScore=${predictiveScore}, forecast=${maintenanceForecast}, anomaly=${anomalyDetected}`,
      );
    } catch (error) {
      const fallbackScore = await this.computeFallbackScore(asset);
      await this.assetRepository.update(
        { assetId: asset.assetId },
        { predictiveScore: fallbackScore, scoreEstimated: true },
      );
      await this.saveSummary(
        asset.assetId,
        fallbackScore,
        this.forecastFor(fallbackScore),
        fallbackScore > 0.7,
      );
      this.logger.error(
        `[auto-ai] Failed to refresh predictive data for ${asset.assetId}: ${
          (error as Error).message
        }. Fallback score ${fallbackScore} applied (estimated).`,
      );
    }
  }

  private notifyRisk(
    asset: AssetEntity,
    predictiveScore: number,
    anomalyDetected: boolean,
  ) {
    return this.mailerService.sendToAdmins('AI alert: unusual asset activity', [
      `Asset "${asset.assetName || asset.assetId}" (${asset.assetId}) has flagged unusual activity.`,
      `Predictive risk score: ${predictiveScore}`,
      `Anomaly detected: ${anomalyDetected ? 'Yes' : 'No'}`,
      'Please review the asset details and schedule maintenance if needed.',
    ]);
  }
}
