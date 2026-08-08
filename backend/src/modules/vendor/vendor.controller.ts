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
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateVendorDto, UpdateVendorDto } from './vendor.dto';
import { VendorService } from './vendor.service';

@ApiTags('vendors')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get()
  @ApiOperation({ summary: 'List all vendors' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active/inactive)' })
  findAll(@Query('status') status?: string) {
    return this.vendorService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a vendor by vendorId' })
  findOne(@Param('id') id: string) {
    return this.vendorService.findOne(id);
  }

  @Post()
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Create a new vendor (Admin/IT Department)' })
  @ApiBody({ type: CreateVendorDto })
  create(@Body() body: CreateVendorDto, @Req() req: any) {
    return this.vendorService.create(body, req.user?.username);
  }

  @Put(':id')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Update a vendor (Admin/IT Department)',
    description: 'vendorId is immutable and cannot be changed.',
  })
  @ApiBody({ type: UpdateVendorDto })
  update(@Param('id') id: string, @Body() body: UpdateVendorDto, @Req() req: any) {
    return this.vendorService.update(id, body, req.user?.username);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a vendor (Admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.vendorService.remove(id, req.user?.username);
  }
}
