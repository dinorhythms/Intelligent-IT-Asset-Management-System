import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('auditlogs')
@Controller('auditlogs')
@UseGuards(JwtAuthGuard)
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get(':assetId')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Retrieve the full audit log for an asset (Admin/Tech only)',
    description:
      'Returns every audit entry tied to the asset. Not visible to staff.',
  })
  forAsset(@Param('assetId') assetId: string) {
    return this.auditService.forAsset(assetId);
  }

  @Post()
  @ApiOperation({
    summary:
      'Record an audit event (AI tab usage, password updates, user actions)',
  })
  @ApiBody({
    schema: {
      example: {
        action: 'ai.tab.analysis',
        entityType: 'asset',
        entityId: 'AST-UUID',
        description: 'User opened the AI Analysis tab.',
      },
    },
  })
  addLog(@Body() body: any, @Req() req: any) {
    return this.auditService.log(body?.action || 'audit.entry', {
      actor: body?.actor || req.user?.username,
      entityType: body?.entityType,
      entityId: body?.entityId,
      user: body?.user,
      description: body?.description,
      details: body?.details,
    });
  }
}
