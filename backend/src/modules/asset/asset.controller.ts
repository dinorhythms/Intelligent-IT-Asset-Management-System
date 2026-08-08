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
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List assets (Admin/Technician)',
    description:
      'Staff use GET /assets/mine or GET /assets/assigned/:userId to see only the assets assigned to them.',
  })
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
    return this.assetService.findByAssignedUser(userId);
  }

  @Get('mine')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'List assets assigned to the logged-in user',
  })
  findMine(@Req() req: any) {
    return this.assetService.findMine(req.user?.username);
  }

  @Get('available')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List available assets for request approval (Admin/Technician)',
    description:
      'Returns unassigned assets, optionally filtered by category, with lifecycle status (New/Used), age, department and last service date. Used by the request approval modal.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter available assets by category',
  })
  findAvailable(@Query('category') category?: string) {
    return this.assetService.findAvailable(category);
  }

  @Get(':id/details')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'Get detailed device info for an asset',
    description:
      'Role-aware: ?role=staff returns restricted basic details (no assignment history, cost, vendor or warranty specifics). Admins and Technicians get the full detail set.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'staff -> restricted details, admin -> full details',
  })
  findDetails(
    @Param('id') id: string,
    @Query('role') role?: string,
    @Req() req?: any,
  ) {
    const effectiveRole = req?.user?.role || role || 'admin';
    return this.assetService.findDetails(id, effectiveRole);
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

  @Get(':id/score')
  @ApiOperation({
    summary: 'Get the predictive risk score with estimated flag',
    description:
      'Returns the current predictive score and whether it is a fallback estimate because AI telemetry is incomplete.',
  })
  score(@Param('id') id: string) {
    return this.assetService.getScore(id);
  }

  @Get(':id/metrics')
  @ApiOperation({
    summary: 'Get telemetry metrics for an asset',
    description:
      'Returns the telemetry fields (usage hours, temperature, CPU usage, vibration, load factor, years in operation) used by the AI predictive service.',
  })
  metrics(@Param('id') id: string) {
    return this.assetService.getMetrics(id);
  }

  @Put(':id/metrics')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Update telemetry metrics for an asset',
    description:
      'Updates the telemetry metrics and re-runs predictive scoring. Use when telemetry has not been supplied so the AI can make an accurate prediction.',
  })
  updateMetrics(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.assetService.updateMetrics(id, body, req.user);
  }

  @Post(':id/notify-missing')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Notify admins that AI metrics are missing for an asset',
    description:
      'Sends an SMTP email to all admins explaining that telemetry metrics are missing so the AI cannot predict accurately for this asset.',
  })
  notifyMissing(@Param('id') id: string) {
    return this.assetService.notifyMissingMetrics(id);
  }

  @Get(':id/assignments')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Retrieve assignment history for an asset (Admin/Tech only)',
    description:
      'Lists every assignment for the asset with the assigned user, department, assigned/returned dates and status. Not visible to staff.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    description: 'Admin/Tech only',
  })
  assignments(@Param('id') id: string) {
    return this.assetService.findAssignments(id);
  }

  @Get(':id/returns')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Retrieve return history for an asset (Admin/Tech only)',
    description:
      'Lists return events with who initiated, who confirmed, timestamps and the optional reason. Not visible to staff.',
  })
  returns(@Param('id') id: string) {
    return this.assetService.findReturns(id);
  }

  @Post(':id/return-initiate')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'Initiate a return for an asset (Staff/Admin/Tech)',
    description:
      'Marks the asset as Pending Return, notifies admins/technicians by email, and records who initiated it. An active assignment is required.',
  })
  @ApiBody({
    schema: { example: { reason: 'End of assignment / upgrade' } },
  })
  initiateReturn(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.assetService.initiateReturn(id, req.user, body);
  }

  @Put(':id/return-confirm')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Confirm a pending asset return (Admin/Tech)',
    description:
      'Finalizes the return, updates the assignment with the returned date, and sets the asset back to Available (or In Service if sent for maintenance).',
  })
  @ApiBody({
    schema: {
      example: { destination: 'available', reason: 'Confirmed' },
    },
  })
  confirmReturn(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.assetService.confirmReturn(id, req.user, body);
  }

  @Get(':id/analysis')
  @ApiOperation({
    summary: 'Retrieve aggregated AI analysis for an asset',
    description:
      'Returns risk trend, RUL curve, anomaly frequency, aggregated insights and the latest predictive summary records.',
  })
  analysis(@Param('id') id: string) {
    return this.assetService.findAnalysis(id);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Retrieve AI event history for an asset',
    description:
      'Raw AI events (predict, anomaly, maintenance_schedule) for the asset with friendly names and kind/date/risk filters.',
  })
  @ApiQuery({ name: 'kind', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'risk', required: false })
  aiHistory(
    @Param('id') id: string,
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('risk') risk?: string,
  ) {
    return this.assetService.findAiHistory(id, { kind, from, to, risk });
  }

  @Get(':id')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Get a full asset by ID (Admin/Tech only)',
    description:
      'Returns the complete asset record including cost, vendor, warranty, telemetry and assignment info. Staff use GET /assets/:id/details?role=staff instead.',
  })
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
