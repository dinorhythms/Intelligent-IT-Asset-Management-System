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
import { CreateRequestDto, UpdateRequestDto } from './request.dto';
import { RequestService } from './request.service';

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Get()
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List all requests (Admin/Technician)',
    description:
      'Admin and Technician see every request. Staff use GET /requests/mine to see their own.',
  })
  @ApiResponse({ status: 200, description: 'Requests returned successfully' })
  findAll() {
    return this.requestService.findAll();
  }

  @Get('mine')
  @ApiOperation({ summary: 'List the logged-in user’s requests' })
  findMine(@Req() req: any) {
    return this.requestService.findMine(req.user?.username);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a request by requestNo' })
  findOne(@Param('id') id: string) {
    return this.requestService.findOne(id);
  }

  @Post()
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'Submit a device request',
    description:
      'Staff submit a request with a category, quantity, priority and reason. The request number is auto-generated as a UUID. Admins and technicians review it and assign available assets after approval.',
  })
  @ApiBody({
    type: CreateRequestDto,
  })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  create(@Body() body: CreateRequestDto, @Req() req: any) {
    return this.requestService.create(body, req.user);
  }

  @Put(':id/approve')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'Approve a request (Admin/Technician)',
    description:
      'Marks the request as approved and notifies the requester. Available assets are assigned separately from the Assignments page.',
  })
  approve(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.requestService.approve(id, req.user, body?.comment);
  }

  @Put(':id/reject')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Reject a request (Admin/Technician)' })
  reject(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.requestService.reject(id, req.user, body?.comment);
  }

  @Put(':id')
  @Roles('admin', 'technician')
  @ApiOperation({ summary: 'Update a request' })
  @ApiBody({ type: UpdateRequestDto })
  update(@Param('id') id: string, @Body() body: UpdateRequestDto, @Req() req: any) {
    return this.requestService.update(id, body, req.user);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a request' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.requestService.remove(id, req.user);
  }
}
