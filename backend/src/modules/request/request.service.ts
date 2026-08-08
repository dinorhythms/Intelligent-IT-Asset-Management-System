import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { MailerService } from '../mailer/mailer.service';
import { RequestEntity } from './request.entity';

@Injectable()
export class RequestService {
  constructor(
    @InjectRepository(RequestEntity)
    private readonly requestRepository: Repository<RequestEntity>,
    private readonly auditService: AuditService,
    private readonly mailerService: MailerService,
  ) {}

  async findAll() {
    return this.requestRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    return this.requestRepository.findOne({ where: { requestNo: id } });
  }

  async findMine(username: string) {
    return this.requestRepository.find({
      where: { requestedBy: username },
      order: { createdAt: 'DESC' },
    });
  }

  async create(body: any, user?: any) {
    const request = this.requestRepository.create({
      requestNo: randomUUID(),
      category: body.category,
      qty: Number(body.qty) || 1,
      requestPriority: body.requestPriority || 'normal',
      reason: body.reason || undefined,
      approvalStatus: 'pending',
      requestStatus: 'open',
      requestedBy: body.requestedBy || user?.username || null,
    }) as unknown as RequestEntity;
    const saved = await this.requestRepository.save(request);
    await this.auditService.log('request.created', {
      actor: user?.username,
      entityType: 'request',
      entityId: saved.requestNo,
      details: {
        category: saved.category,
        qty: saved.qty,
        priority: saved.requestPriority,
      },
    });
    void this.mailerService.sendToAdminAndTechnicians(
      'New asset request submitted',
      [
        `A new asset request has been submitted by ${user?.username || saved.requestedBy || 'a user'}.`,
        `Category: ${saved.category || '—'}`,
        `Quantity: ${saved.qty}`,
        `Priority: ${saved.requestPriority}`,
        `Reason: ${saved.reason || '—'}`,
        'Review the request and assign available assets after approval.',
      ],
    );
    return saved;
  }

  async update(id: string, body: any, user?: any) {
    const request = await this.requestRepository.findOne({
      where: { requestNo: id },
    });
    if (!request) return null;
    Object.assign(request, body);
    const saved = await this.requestRepository.save(request);
    await this.auditService.log('request.updated', {
      actor: user?.username,
      entityType: 'request',
      entityId: saved.requestNo,
    });
    return saved;
  }

  async approve(id: string, user?: any, comment?: string) {
    const request = await this.requestRepository.findOne({
      where: { requestNo: id },
    });
    if (!request) return null;
    if (request.approvalStatus === 'approved') {
      return { message: 'Request already approved', request };
    }

    request.approvalStatus = 'approved';
    request.approvedBy = user?.username;
    request.reviewComment = comment || request.reviewComment;
    const saved = await this.requestRepository.save(request);

    await this.auditService.log('request.approved', {
      actor: user?.username,
      entityType: 'request',
      entityId: saved.requestNo,
      details: { comment: comment || '' },
    });

    const requesterEmail = await this.mailerService.findUserEmail(
      saved.requestedBy,
    );
    void this.mailerService.sendToUser(
      requesterEmail,
      'Your asset request was approved',
      [
        `Hello ${saved.requestedBy || 'there'},`,
        `Your request for ${saved.qty} x ${saved.category} (${saved.requestPriority} priority) has been approved.`,
        'An administrator or technician will assign an available asset to you shortly.',
        saved.reason ? `Your reason: ${saved.reason}` : '',
      ],
    );

    return { request: saved };
  }

  async reject(id: string, user?: any, comment?: string) {
    const request = await this.requestRepository.findOne({
      where: { requestNo: id },
    });
    if (!request) return null;
    if (request.approvalStatus === 'rejected') {
      return { message: 'Request already rejected', request };
    }

    request.approvalStatus = 'rejected';
    request.rejectedBy = user?.username;
    request.reviewComment = comment || request.reviewComment;
    const saved = await this.requestRepository.save(request);

    await this.auditService.log('request.rejected', {
      actor: user?.username,
      entityType: 'request',
      entityId: saved.requestNo,
      details: { comment: comment || '' },
    });

    const requesterEmail = await this.mailerService.findUserEmail(
      saved.requestedBy,
    );
    void this.mailerService.sendToUser(
      requesterEmail,
      'Your asset request was rejected',
      [
        `Hello ${saved.requestedBy || 'there'},`,
        `Your request for ${saved.qty} x ${saved.category} has been rejected.`,
        saved.reviewComment
          ? `Reason: ${saved.reviewComment}`
          : 'No comment was provided. Contact your administrator for details.',
      ],
    );

    return { request: saved };
  }

  async remove(id: string, user?: any) {
    const request = await this.requestRepository.findOne({
      where: { requestNo: id },
    });
    if (request) {
      await this.auditService.log('request.deleted', {
        actor: user?.username,
        entityType: 'request',
        entityId: request.requestNo,
      });
      await this.requestRepository.remove(request);
    }
    return { deleted: true, id };
  }
}
