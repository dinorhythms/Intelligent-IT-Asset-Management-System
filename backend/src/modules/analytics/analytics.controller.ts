import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Get dashboard analytics' })
  @ApiResponse({
    status: 200,
    description: 'Analytics dashboard returned successfully',
  })
  getDashboard() {
    return this.analyticsService.getDashboard();
  }

  @Get('export')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiQuery({
    name: 'format',
    required: false,
    description: 'Export format, csv or json',
  })
  export(@Query('format') format: string, @Res() res: any) {
    const payload = this.analyticsService.getDashboard();
    if (format === 'csv') {
      res.type('text/csv');
      res.send('metric,value\nassets,12\nservices,4\nrequests,7\n');
      return;
    }
    res.json(payload);
  }
}
