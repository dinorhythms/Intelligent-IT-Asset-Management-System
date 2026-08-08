import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'List audit logs',
    description:
      'Tracks who requested, approved, assigned and returned assets, plus all administrative actions.',
  })
  findAll() {
    return this.auditService.findAll();
  }

  @Post('logs')
  @Roles('admin')
  @ApiOperation({
    summary: 'Record an audit log entry manually (Admin)',
    description:
      'Records approval/assignment entries with lifecycle status, e.g. "Admin approved request REQ-UUID and assigned asset AST-UUID (New) to user Oladehinde Kazeem."',
  })
  @ApiBody({
    schema: {
      example: {
        action: 'request.approved',
        entityType: 'request',
        entityId: 'REQ-UUID',
        description:
          'admin approved request REQ-UUID and assigned asset AST-UUID (New) to user Oladehinde Kazeem.',
        details: { assetId: 'AST-UUID', lifecycleStatus: 'New' },
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

  @Get(':entityType/:entityId')
  @Roles('admin')
  @ApiOperation({ summary: 'View audit history for a specific entity' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(entityType, entityId);
  }
}
