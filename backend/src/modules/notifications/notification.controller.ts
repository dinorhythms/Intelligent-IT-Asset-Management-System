import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Send a notification' })
  @ApiBody({ type: Object, description: 'Notification payload' })
  @ApiResponse({
    status: 201,
    description: 'Notification queued or dispatched',
  })
  send(@Body() body: any) {
    return this.notificationService.send(body);
  }
}
