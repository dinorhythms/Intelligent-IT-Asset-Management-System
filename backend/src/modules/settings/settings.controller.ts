import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from '../audit/audit.service';
import { MailerService } from '../mailer/mailer.service';
import { QrCodeService } from '../qrcode/qrcode.service';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly qrCodeService: QrCodeService,
    private readonly mailerService: MailerService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get system settings (e.g. QR base URL)' })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Get('baseurl')
  @ApiOperation({ summary: 'Get the current QR code base URL' })
  getBaseUrl() {
    return this.settingsService.getQrBaseUrl().then((qrBaseUrl) => ({ qrBaseUrl }));
  }

  @Get('theme')
  @ApiOperation({ summary: 'Get the current theme preference' })
  getTheme() {
    return this.settingsService.getTheme();
  }

  @Put('theme')
  @ApiOperation({ summary: 'Update the theme preference' })
  @ApiBody({ schema: { example: { theme: 'dark' } } })
  setTheme(@Body() body: { theme?: string }) {
    return this.settingsService.setTheme(body?.theme || 'dark');
  }

  @Get('smtp')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get current SMTP settings (Admin only)',
    description:
      'Returns SMTP configuration with the password masked. Passwords are stored encrypted.',
  })
  getSmtp() {
    return this.settingsService.getSmtpSettings();
  }

  @Put('smtp')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update SMTP settings (Admin only)',
    description:
      'Stores SMTP credentials with the password encrypted. Sends a configuration-change notification to admins.',
  })
  @ApiBody({
    schema: {
      example: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: 'ops@example.com',
        smtpPassword: 'app-password',
        fromEmail: 'it-assets@example.com',
      },
    },
  })
  async updateSmtp(@Body() body: Record<string, any>, @Req() req: any) {
    const updated = await this.settingsService.updateSmtpSettings(body);
    await this.auditService.log('settings.smtp.updated', {
      actor: req.user?.username,
      entityType: 'settings',
      entityId: 'smtp',
    });
    void this.mailerService.sendToAdmins('SMTP settings changed', [
      `The SMTP configuration was updated by ${req.user?.username || 'an administrator'}.`,
      'All future notifications will use the new settings.',
    ]);
    return updated;
  }

  @Post('smtp/test')
  @Roles('admin')
  @ApiOperation({
    summary: 'Send a test email to verify the SMTP configuration',
    description:
      'Attempts to send a test message to all admin addresses (or the supplied recipient) using the current SMTP settings.',
  })
  @ApiBody({ schema: { example: { recipient: 'ops@example.com' } } })
  async testSmtp(@Body() body: { recipient?: string }, @Req() req: any) {
    const config = await this.settingsService.getSmtpSettings();
    if (!config.smtpConfigured) {
      return {
        success: false,
        message:
          'SMTP is not configured. Provide a host and from address first.',
      };
    }
    const recipient =
      body?.recipient?.trim() ||
      (await this.mailerService.listRoleEmails('admin'))[0];
    if (!recipient) {
      return {
        success: false,
        message:
          'No recipient email found. Provide a recipient or ensure an admin has an email address.',
      };
    }
    const result = await this.mailerService.send({
      to: recipient,
      subject: 'IT Asset Management — SMTP test',
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;padding:24px;background:#f3f4f6;"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h2 style="color:#047857;">SMTP test successful</h2><p>This message confirms that email delivery is working correctly using the configured SMTP settings.</p><p style="color:#6b7280;">Triggered by ${req.user?.username || 'admin'} at ${new Date().toISOString()}.</p></div></body></html>`,
      text: `SMTP test successful. Triggered by ${req.user?.username || 'admin'} at ${new Date().toISOString()}.`,
    });
    return {
      success: result.delivered === true,
      delivered: result.delivered === true,
      message:
        result.delivered === true
          ? 'Test email sent successfully.'
          : result.error || 'Could not send the test email. Check the SMTP settings.',
    };
  }

  @Put()
  @Roles('admin')
  @ApiOperation({
    summary: 'Update system settings (e.g. QR base URL)',
    description:
      'When the QR base URL changes, every asset QR code is automatically regenerated.',
  })
  @ApiBody({
    schema: { example: { qrBaseUrl: 'https://assets.company.com' } },
  })
  async updateSettings(@Body() body: Record<string, string>, @Req() req: any) {
    const qrBaseUrl = body?.qrBaseUrl;
    let regenerated;
    if (qrBaseUrl && typeof qrBaseUrl === 'string') {
      const result = await this.qrCodeService.updateBaseUrl(
        qrBaseUrl,
        req.user?.username,
      );
      if ('updated' in result) regenerated = result.updated;
    }
    const settings = await this.settingsService.updateSettings(body || {});
    return regenerated !== undefined
      ? { ...settings, qrCodesRegenerated: regenerated }
      : settings;
  }
}
