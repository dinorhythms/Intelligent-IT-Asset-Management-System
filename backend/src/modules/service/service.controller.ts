import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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

  @Get(':id')
  @ApiOperation({ summary: 'Get a service record by serviceId' })
  findOne(@Param('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
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
  @Roles('admin', 'manager')
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
