import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  health() {
    return this.adminService.health();
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  settings(@Body() body: any) {
    return this.adminService.settings(body);
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  logs(@Req() req: any) {
    return this.adminService.logs(req.user);
  }
}
