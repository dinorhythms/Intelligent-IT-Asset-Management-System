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
import { CreateDepartmentDto, UpdateDepartmentDto } from './department.dto';
import { DepartmentService } from './department.service';

@ApiTags('departments')
@Controller('departments')
@UseGuards(JwtAuthGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (active/inactive)',
  })
  findAll(@Query('status') status?: string) {
    return this.departmentService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by departmentId' })
  findOne(@Param('id') id: string) {
    return this.departmentService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new department (Admin only)' })
  @ApiBody({ type: CreateDepartmentDto })
  create(@Body() body: CreateDepartmentDto, @Req() req: any) {
    return this.departmentService.create(body, req.user?.username);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update a department (Admin only)',
    description: 'departmentId is immutable and cannot be changed.',
  })
  @ApiBody({ type: UpdateDepartmentDto })
  update(
    @Param('id') id: string,
    @Body() body: UpdateDepartmentDto,
    @Req() req: any,
  ) {
    return this.departmentService.update(id, body, req.user?.username);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a department (Admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.departmentService.remove(id, req.user?.username);
  }
}
