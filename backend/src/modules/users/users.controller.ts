import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all users (Admin only)' })
  findAll() {
    return this.usersService.findAll();
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
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.usersService.update(id, body, req.user?.username);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.remove(id, req.user?.username);
  }
}
