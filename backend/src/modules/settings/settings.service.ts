import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  encryptSecret,
  SMTP_KEYS,
} from '../mailer/mailer.service';
import { SettingsEntity } from './settings.entity';

export const DEFAULT_QR_BASE_URL = 'http://localhost:3000';
export const QR_BASE_URL_KEY = 'qrBaseUrl';
export const THEME_KEY = 'theme';

export interface SmtpSettingsView {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  fromEmail: string;
  hasPassword: boolean;
  smtpConfigured: boolean;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingsEntity)
    private readonly settingsRepository: Repository<SettingsEntity>,
  ) {}

  async get(key: string, fallback: string): Promise<string> {
    const entry = await this.settingsRepository
      .findOne({ where: { key } })
      .catch(() => null);
    return entry?.value || fallback;
  }

  async set(key: string, value: string): Promise<void> {
    let entry = await this.settingsRepository
      .findOne({ where: { key } })
      .catch(() => null);
    if (entry) {
      entry.value = value;
      await this.settingsRepository.save(entry);
    } else {
      entry = this.settingsRepository.create({ key, value });
      await this.settingsRepository.save(entry);
    }
  }

  async getQrBaseUrl(): Promise<string> {
    const stored = await this.get(QR_BASE_URL_KEY, DEFAULT_QR_BASE_URL);
    const cleaned = (stored || '').trim().replace(/\/+$/, '');
    if (!isValidHttpUrl(cleaned)) {
      return DEFAULT_QR_BASE_URL;
    }
    return cleaned;
  }

  async getTheme(): Promise<string> {
    return this.get(THEME_KEY, 'dark');
  }

  async setTheme(theme: string): Promise<{ theme: string }> {
    const value = theme === 'light' ? 'light' : 'dark';
    await this.set(THEME_KEY, value);
    return { theme: value };
  }

  async getSettings() {
    const entries = await this.settingsRepository.find().catch(() => []);
    const settings: Record<string, string> = {};
    for (const entry of entries) {
      settings[entry.key] = entry.value;
    }
    settings[QR_BASE_URL_KEY] = await this.getQrBaseUrl();
    return settings;
  }

  async updateSettings(patch: Record<string, string>) {
    for (const [key, value] of Object.entries(patch)) {
      if (typeof value === 'string') {
        await this.set(key, value);
      }
    }
    return this.getSettings();
  }

  async getSmtpSettings(): Promise<SmtpSettingsView> {
    const host = await this.get(SMTP_KEYS.host, '');
    const port = Number(await this.get(SMTP_KEYS.port, '587')) || 587;
    const user = await this.get(SMTP_KEYS.user, '');
    const storedPassword = await this.get(SMTP_KEYS.password, '');
    const fromEmail = await this.get(SMTP_KEYS.fromEmail, '');
    return {
      smtpHost: host,
      smtpPort: port,
      smtpUser: user,
      fromEmail,
      hasPassword: Boolean(storedPassword),
      smtpConfigured: Boolean(host && fromEmail),
    };
  }

  async updateSmtpSettings(body: Record<string, any>) {
    const allowed: Record<string, string> = {
      smtpHost: SMTP_KEYS.host,
      smtpPort: SMTP_KEYS.port,
      smtpUser: SMTP_KEYS.user,
      fromEmail: SMTP_KEYS.fromEmail,
    };
    for (const [field, key] of Object.entries(allowed)) {
      if (body[field] !== undefined && body[field] !== null) {
        await this.set(key, String(body[field]).trim());
      }
    }
    if (body.smtpPassword) {
      await this.set(SMTP_KEYS.password, encryptSecret(String(body.smtpPassword)));
    }
    return this.getSmtpSettings();
  }
}
