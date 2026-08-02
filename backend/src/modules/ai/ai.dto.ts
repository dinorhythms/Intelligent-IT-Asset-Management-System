import { ApiProperty } from '@nestjs/swagger';

export class AiPredictDto {
  @ApiProperty({ example: 'AST-1001', required: false })
  assetId?: string;

  @ApiProperty({ example: 320, required: false })
  usage_hours?: number;

  @ApiProperty({ example: 82, required: false })
  temperature?: number;

  @ApiProperty({ example: 88, required: false })
  cpu_usage?: number;

  @ApiProperty({ example: 3.1, required: false })
  vibration?: number;

  @ApiProperty({ example: 0.7, required: false })
  load_factor?: number;

  @ApiProperty({ example: 3, required: false })
  years_operation?: number;
}

export class AiRecommendDto {
  @ApiProperty({ example: 'AST-1001', required: false })
  assetId?: string;

  @ApiProperty({ example: 0.78, required: false })
  predictive_score?: number;

  @ApiProperty({ example: false, required: false })
  anomaly_detected?: boolean;

  @ApiProperty({ example: 320, required: false })
  usage_hours?: number;

  @ApiProperty({ example: 82, required: false })
  temperature?: number;

  @ApiProperty({ example: 88, required: false })
  cpu_usage?: number;
}

export class AiMaintenanceDto {
  @ApiProperty({ example: 'AST-1001', required: false })
  assetId?: string;

  @ApiProperty({ example: 320, required: false })
  usage_hours?: number;

  @ApiProperty({ example: '2026-05-01', required: false })
  last_maintenance_date?: string;

  @ApiProperty({ example: 90, required: false })
  maintenance_interval_days?: number;
}
