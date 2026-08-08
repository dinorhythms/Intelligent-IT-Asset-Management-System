import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private assertSelf(id: string, req: any) {
    if (String(req.user?.userId) !== String(id)) {
      throw new ForbiddenException('You can only manage your own profile');
    }
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (Admin only)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('receivers')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List receivers for asset intake (Admins + ICT/IT staff)',
  })
  findReceivers() {
    return this.usersService.findReceivers();
  }

  @Get('technicians')
  @Roles('admin', 'technician')
  @ApiOperation({
    summary: 'List technicians for service logging (Technicians + ICT/IT staff)',
  })
  findTechnicians() {
    return this.usersService.findTechnicians();
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBody({
    schema: {
      example: {
        firstName: 'Jane',
        lastName: 'Doe',
        otherNames: '',
        department: 'Finance',
        location: 'Lagos',
        phoneNumber: '+2348012345678',
        email: 'jane@example.com',
        password: 'secret123',
        role: 'staff',
      },
    },
  })
  create(@Body() body: any, @Req() req: any) {
    return this.usersService.create(body, req.user?.username);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user details (Admin only)' })
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.usersService.update(id, body, req.user?.username);
  }

  @Get(':id/profile')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({
    summary: 'Get the current user profile (readonly fields + password info)',
  })
  profile(@Param('id') id: string, @Req() req: any) {
    this.assertSelf(id, req);
    return this.usersService.getProfile(id);
  }

  @Put(':id/password')
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({ summary: 'Update the current user password (Staff/Tech only)' })
  @ApiBody({
    schema: {
      example: {
        currentPassword: 'secret123',
        newPassword: 'newsecret456',
      },
    },
  })
  updatePassword(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    this.assertSelf(id, req);
    return this.usersService.updatePassword(id, body, req.user?.username);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  remove(@Param('id') id: string, @Req() req: any) {
    return this.usersService.remove(id, req.user?.username);
  }
}
