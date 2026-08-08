import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { LoginDto, RegisterDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Log in a user' })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiBody({ type: LoginDto })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiBody({ type: RegisterDto })
  register(@Body() body: RegisterDto, @Req() req: any) {
    return this.authService.register(body, req.user?.username);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: any) {
    return this.authService.logout(req.user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({ summary: 'Get the logged-in user profile' })
  profile(@Req() req: any) {
    return this.authService.me(req.user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @Roles('admin', 'technician', 'staff')
  @ApiOperation({ summary: 'Get the logged-in user profile (alias)' })
  me(@Req() req: any) {
    return this.authService.me(req.user);
  }
}
