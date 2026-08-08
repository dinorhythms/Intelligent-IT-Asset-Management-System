import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { QrCodeService } from './qrcode.service';

@ApiTags('qrcode')
@Controller('qrcode')
@UseGuards(JwtAuthGuard)
export class QrCodeController {
  constructor(private readonly qrCodeService: QrCodeService) {}

  @Get('baseurl')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Get the configured QR base URL' })
  getBaseUrl() {
    return this.qrCodeService.getBaseUrl();
  }

  @Get(':assetId')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Generate (or fetch) the QR code for an asset',
    description:
      'The QR code embeds <baseUrl>/view/<uniqueId>, resolving to a public frontend view route showing asset and user details.',
  })
  generate(@Param('assetId') assetId: string) {
    return this.qrCodeService.generate(assetId);
  }

  @Put('baseurl')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update the QR base URL for all assets (Admin only)',
    description:
      'Updates the stored base URL and automatically regenerates every asset QR code.',
  })
  @ApiBody({ schema: { example: { qrBaseUrl: 'https://assets.company.com' } } })
  updateBaseUrl(@Body() body: { qrBaseUrl?: string }, @Req() req: any) {
    return this.qrCodeService.updateBaseUrl(body.qrBaseUrl, req.user?.username);
  }
}
