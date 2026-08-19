import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateServiceDto, UpdateServiceDto } from './service.dto';
import { ServiceService } from './service.service';

@ApiTags('services')
@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  @Get()
  @ApiOperation({ summary: 'List service records' })
  @ApiResponse({ status: 200, description: 'Service records returned' })
  findAll() {
    return this.serviceService.findAll();
  }

  @Get('mine')
  @ApiOperation({
    summary: 'List service records for assets assigned to the logged-in user',
  })
  findMine(@Req() req: any) {
    return this.serviceService.findMine(req.user?.username);
  }

  @Get('overdue')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List vendor service records whose expected return date has passed',
    description:
      'Returns service records that were sent to a vendor with an expected_return_date in the past and are not yet completed/cancelled, so the service page can flag them as overdue.',
  })
  findOverdue() {
    return this.serviceService.findOverdue();
  }

  @Get('asset/:assetId')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List service records for an asset (Admin/Tech only)',
    description:
      'Returns the full service history for an asset including technician notes. Not visible to staff.',
  })
  findByAsset(@Param('assetId') assetId: string) {
    return this.serviceService.findByAsset(assetId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a service record by serviceId' })
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Post()
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Log a service / maintenance completion',
    description:
      'Creates a service record and automatically triggers /ai/maintenance_schedule to compute the next maintenance date, updating asset_details.next_maintenance_date for the linked asset. The result is persisted in ai_service_results.',
  })
  @ApiBody({
    type: CreateServiceDto,
  })
  @ApiResponse({ status: 201, description: 'Service record created' })
  create(@Body() body: CreateServiceDto) {
    return this.serviceService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Update a service record',
    description:
      'Updates the service record and re-runs /ai/maintenance_schedule, refreshing asset_details.next_maintenance_date.',
  })
  @ApiBody({ type: UpdateServiceDto })
  update(@Param('id') id: string, @Body() body: UpdateServiceDto) {
    return this.serviceService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a service record' })
  remove(@Param('id') id: string) {
    return this.serviceService.remove(id);
  }
}
