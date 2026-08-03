import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateAssetDto, ScanAssetDto, UpdateAssetDto } from './asset.dto';
import { AssetService } from './asset.service';

@ApiTags('assets')
@Controller('assets')
@UseGuards(JwtAuthGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get()
  @ApiOperation({ summary: 'List assets' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter assets by status',
  })
  @ApiResponse({ status: 200, description: 'Assets returned successfully' })
  findAll(@Query('status') status?: string) {
    return this.assetService.findAll(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetService.findOne(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Create an asset',
    description:
      'Creates an asset and automatically triggers the AI service (/ai/predict + /ai/anomaly) with the supplied telemetry (usage_hours, temperature, cpu_usage, vibration, load_factor, years_operation). The returned predictiveScore is stored in asset_details and a summary row is inserted into predictive_results.',
  })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  create(@Body() body: CreateAssetDto) {
    return this.assetService.create(body);
  }

  @Put(':id')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Update an asset',
    description:
      'Updates an asset and automatically re-runs /ai/predict + /ai/anomaly, refreshing asset_details.predictiveScore and predictive_results.',
  })
  @ApiBody({ type: UpdateAssetDto })
  update(@Param('id') id: string, @Body() body: UpdateAssetDto) {
    return this.assetService.update(id, body);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string) {
    return this.assetService.remove(id);
  }

  @Post('scan')
  @Roles('admin', 'technician', 'manager')
  @ApiOperation({ summary: 'Scan a QR code' })
  @ApiResponse({ status: 200, description: 'QR scan processed' })
  @ApiBody({ type: ScanAssetDto })
  scan(@Body() body: ScanAssetDto) {
    return this.assetService.scan(body);
  }

  @Post(':id/predict')
  @Roles('admin', 'manager')
  @ApiOperation({
    summary: 'Get predictive maintenance insight for an asset',
    description:
      'Runs the predictive pipeline against the AI service and returns the latest predictiveScore, maintenance forecast and anomaly state.',
  })
  @ApiResponse({ status: 200, description: 'Predictive maintenance response' })
  predict(@Param('id') id: string) {
    return this.assetService.predict(id);
  }
}
