import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notificationRepository: Repository<NotificationEntity>,
  ) {}

  async send(body: any) {
    const notification = this.notificationRepository.create({
      recipient: body.recipient || 'ops@example.com',
      channel: body.channel || 'email',
      message: body.message || 'Notification queued',
      delivered: true,
    });
    const saved = await this.notificationRepository.save(notification);
    return {
      delivered: saved.delivered,
      channel: saved.channel,
      recipient: saved.recipient,
      message: saved.message,
    };
  }
}
