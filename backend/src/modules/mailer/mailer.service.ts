import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity';
import { SettingsEntity } from '../settings/settings.entity';

export const SMTP_KEYS = {
  host: 'smtpHost',
  port: 'smtpPort',
  user: 'smtpUser',
  password: 'smtpPassword',
  fromEmail: 'fromEmail',
} as const;

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  smtpConfigured: boolean;
}

export interface SendMailInput {
  to?: string | string[];
  cc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

const FALLBACK_ENCRYPTION_KEY = 'it-asset-mailer-insecure-dev-key';

function encryptionKey(): Buffer {
  const secret = process.env.MAILER_ENCRYPTION_KEY || FALLBACK_ENCRYPTION_KEY;
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString(
    'base64',
  )}`;
}

export function decryptSecret(payload: string): string {
  if (!payload || !payload.startsWith('enc:v1:')) return payload;
  const parts = payload.split(':');
  if (parts.length !== 5) return payload;
  const [, , ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return '';
  }
}

function htmlTemplate(title: string, lines: string[]): string {
  const body = lines.map((line) => `<p style="margin:0 0 8px;">${line}</p>`).join('');
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111827;background:#f3f4f6;margin:0;padding:24px;"><div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h2 style="margin:0 0 12px;color:#047857;font-size:18px;">${title}</h2>${body}<p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">Sent by the IT Asset Management system.</p></div></body></html>`;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>,
  ) {}

  private async getValue(key: string, fallback = ''): Promise<string> {
    const entry = await this.settingsRepository
      .findOne({ where: { key } })
      .catch(() => null);
    return entry?.value || fallback;
  }

  async getSmtpConfig(): Promise<SmtpConfig> {
    const host = await this.getValue(SMTP_KEYS.host, '');
    const portValue = await this.getValue(SMTP_KEYS.port, '587');
    const user = await this.getValue(SMTP_KEYS.user, '');
    const storedPassword = await this.getValue(SMTP_KEYS.password, '');
    const fromEmail = await this.getValue(SMTP_KEYS.fromEmail, '');
    const smtpPassword = storedPassword
      ? decryptSecret(storedPassword)
      : '';
    return {
      smtpHost: host,
      smtpPort: Number(portValue) || 587,
      smtpUser: user,
      smtpPassword,
      fromEmail,
      smtpConfigured: Boolean(host && fromEmail),
    };
  }

  async send(input: SendMailInput) {
    const { to, cc, subject, text, html } = input;
    if (!to || (Array.isArray(to) && to.length === 0)) {
      return { skipped: true, message: 'No recipients configured' };
    }
    const config = await this.getSmtpConfig();
    if (!config.smtpConfigured) {
      this.logger.warn(
        `[mailer] SMTP not configured; email "${subject}" to ${JSON.stringify(
          to,
        )} skipped.`,
      );
      return {
        skipped: true,
        message: 'SMTP is not configured. Configure it in Settings to send emails.',
      };
    }
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: config.smtpUser
          ? { user: config.smtpUser, pass: config.smtpPassword }
          : undefined,
      });
      const info = await transporter.sendMail({
        from: config.fromEmail,
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: Array.isArray(cc) && cc.length > 0 ? cc.join(', ') : undefined,
        subject,
        text: text || subject,
        html,
      });
      this.logger.log(`[mailer] Email sent: ${subject} (${info.messageId})`);
      return { delivered: true, messageId: info.messageId, to, cc };
    } catch (error) {
      this.logger.error(
        `[mailer] Failed to send "${subject}": ${(error as Error).message}`,
      );
      return { delivered: false, error: (error as Error).message };
    }
  }

  async listRoleEmails(role: string): Promise<string[]> {
    const users = await this.userRepository
      .find({ where: { role, loginStatus: 'active' } })
      .catch(() => []);
    const emails = users.map((user) => user.email).filter(Boolean) as string[];
    return [...new Set(emails)];
  }

  async findUserEmail(username?: string): Promise<string> {
    if (!username) return '';
    const user = await this.userRepository
      .findOne({ where: { username } })
      .catch(() => null);
    return user?.email || '';
  }

  async sendToAdmins(subject: string, lines: string[]) {
    const to = await this.listRoleEmails('admin');
    if (to.length === 0) return { skipped: true };
    return this.send({
      to,
      subject,
      html: htmlTemplate('IT Asset Management — Admin alert', lines),
      text: lines.join('\n'),
    });
  }

  async sendToAdminAndTechnicians(subject: string, lines: string[]) {
    const admins = await this.listRoleEmails('admin');
    const technicians = await this.listRoleEmails('technician');
    const to = [...admins, ...technicians];
    if (to.length === 0) return { skipped: true };
    return this.send({
      to: to.filter((email) => !admins.includes(email)),
      cc: admins,
      subject,
      html: htmlTemplate('IT Asset Management — Notification', lines),
      text: lines.join('\n'),
    });
  }

  async sendToUser(email: string, subject: string, lines: string[]) {
    if (!email) return { skipped: true, message: 'User has no email address' };
    return this.send({
      to: email,
      subject,
      html: htmlTemplate('IT Asset Management — Notification', lines),
      text: lines.join('\n'),
    });
  }

  async sendToUserByName(username: string, subject: string, lines: string[]) {
    const email = await this.findUserEmail(username);
    return this.sendToUser(email, subject, lines);
  }
}
