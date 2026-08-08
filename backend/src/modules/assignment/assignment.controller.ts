import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AssignmentService } from './assignment.service';

@ApiTags('assignments')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Get()
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'List all assignments' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('status') status?: string) {
    return this.assignmentService.findAll(status);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List assignments for the logged-in user' })
  findMine(@Req() req: any) {
    return this.assignmentService.findAllMine(req.user?.username);
  }

  @Post()
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Assign an asset to a user (Admin/Technician)',
    description: 'Only unassigned (Available) assets can be assigned.',
  })
  @ApiBody({
    schema: {
      example: { assetId: 'LAPTOP-001', username: 'jane.doe', notes: 'New starter kit' },
    },
  })
  create(@Body() body: any, @Req() req: any) {
    return this.assignmentService.create(body, req.user?.username);
  }

  @Put(':id/return')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Mark an assigned asset as returned',
    description: 'Sets the assignment to returned and the asset status back to Available.',
  })
  returnAsset(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.assignmentService.returnAsset(id, req.user?.username);
  }
}
