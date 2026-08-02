import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiMaintenanceDto, AiPredictDto, AiRecommendDto } from './ai.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check the AI microservice health' })
  health() {
    return this.aiService.health();
  }

  @Post('predict')
  @ApiOperation({ summary: 'Get a predictive score from the AI service' })
  @ApiBody({ type: AiPredictDto })
  predict(@Body() body: AiPredictDto) {
    return this.aiService.predict({ ...body });
  }

  @Post('anomaly')
  @ApiOperation({ summary: 'Detect anomalies in asset metrics' })
  @ApiBody({ type: AiPredictDto })
  anomaly(@Body() body: AiPredictDto) {
    return this.aiService.detectAnomaly({ ...body });
  }

  @Post('recommend')
  @ApiOperation({ summary: 'Get maintenance recommendations' })
  @ApiBody({ type: AiRecommendDto })
  recommend(@Body() body: AiRecommendDto) {
    return this.aiService.recommend({ ...body });
  }

  @Post('maintenance-schedule')
  @ApiOperation({ summary: 'Get the next maintenance date' })
  @ApiBody({ type: AiMaintenanceDto })
  maintenanceSchedule(@Body() body: AiMaintenanceDto) {
    return this.aiService.maintenanceSchedule({ ...body });
  }

  @Get('history')
  @ApiOperation({ summary: 'List persisted AI service call results' })
  history(@Query('kind') kind?: string) {
    return this.aiService.history(kind);
  }
}
