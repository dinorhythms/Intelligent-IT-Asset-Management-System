import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
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
import { Public } from '../auth/public.decorator';
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
    description: 'Filter assets by status (Available, Assigned, Returned)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter assets by category (Laptop, Printer, Server)',
  })
  @ApiResponse({ status: 200, description: 'Assets returned successfully' })
  findAll(
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    return this.assetService.findAll(status, category);
  }

  @Public()
  @Get('unique/:uniqueId')
  @ApiOperation({
    summary: 'Resolve an asset by its QR unique ID (public view route)',
  })
  findUnique(@Param('uniqueId') uniqueId: string) {
    return this.assetService.findOneByUniqueId(uniqueId);
  }

  @Get('assigned/:userId')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'List assets currently assigned to a user (staff view)',
  })
  findByAssignedUser(@Param('userId') userId: string) {
    return this.assetService.findByAssignedUser(Number(userId));
  }

  @Get(':id/value')
  @ApiOperation({
    summary: 'Get AI-recommended auction value for an asset',
    description:
      'Estimates the current market value using a depreciation model based on purchase cost, usage hours and service history, and recommends an auction/resale value.',
  })
  @ApiResponse({ status: 200, description: 'Valuation returned' })
  value(@Param('id') id: string) {
    return this.assetService.getValue(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetService.findOne(id);
  }

  @Post()
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Create a new asset (Admin/Technician)',
    description:
      'Automatically generates a category-based identifier (LAPTOP-001, PRINTER-001, SERVER-001), a unique QR ID, and a QR code pointing at the configured base URL. Also triggers /ai/predict + /ai/anomaly with the supplied telemetry.',
  })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({ status: 201, description: 'Asset created successfully' })
  create(@Body() body: CreateAssetDto, @Req() req: any) {
    return this.assetService.create(body, req.user);
  }

  @Put(':id')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Update an asset (Admin/Technician)',
  })
  @ApiBody({ type: UpdateAssetDto })
  update(@Param('id') id: string, @Body() body: UpdateAssetDto, @Req() req: any) {
    return this.assetService.update(id, body, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.assetService.remove(id, req.user);
  }

  @Post('scan')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Scan a QR code (Admin/Technician only)' })
  @ApiResponse({ status: 200, description: 'QR scan processed' })
  @ApiBody({ type: ScanAssetDto })
  scan(@Body() body: ScanAssetDto) {
    return this.assetService.scan(body);
  }

  @Post(':id/predict')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Get predictive maintenance insight for an asset',
  })
  @ApiResponse({ status: 200, description: 'Predictive maintenance response' })
  predict(@Param('id') id: string) {
    return this.assetService.predict(id);
  }
}
