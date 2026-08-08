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

  @Get(':userId')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'Get the assets currently assigned to a user (by user ID)',
  })
  findByUserId(@Param('userId') userId: string) {
    return this.assignmentService.findAllByUser(userId);
  }

  @Get('user/:userId')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'List currently assigned assets for a user by user ID',
  })
  findByUser(@Param('userId') userId: string) {
    return this.assignmentService.findAllByUser(userId);
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

  @Put(':id')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Update an assignment (e.g. notes, mark as returned)',
  })
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.assignmentService.update(id, body, req.user?.username);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Delete an assignment',
    description:
      'Removes the assignment and returns the asset to Available status.',
  })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.assignmentService.remove(id, req.user?.username);
  }

  @Put(':id/return')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Mark an assigned asset as returned',
    description: 'Sets the assignment to returned and the asset status back to Available.',
  })
  returnAsset(@Param('id') id: string, @Req() req: any) {
    return this.assignmentService.returnAsset(id, req.user?.username);
  }
}
