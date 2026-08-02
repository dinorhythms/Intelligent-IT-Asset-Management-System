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
import { RequestService } from './request.service';

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Get()
  @ApiOperation({ summary: 'List requests' })
  @ApiResponse({ status: 200, description: 'Requests returned successfully' })
  findAll() {
    return this.requestService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a request by requestNo' })
  findOne(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager', 'technician')
  @ApiOperation({
    summary: 'Create a maintenance/repair request',
    description:
      'Creates a request and automatically triggers the AI service: /ai/anomaly is called with the asset telemetry (taken from the request body or the matching asset), and if anomalies are detected /ai/recommend is called to generate recommended maintenance actions. Results are persisted in ai_service_results.',
  })
  @ApiBody({
    type: Object,
    description:
      'Request payload. Optional telemetry fields: usage_hours, temperature, cpu_usage, vibration, load_factor, years_operation.',
  })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  create(@Body() body: any) {
    return this.requestService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a request' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.requestService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a request' })
  remove(@Param('id') id: string) {
    return this.requestService.remove(id);
  }
}
