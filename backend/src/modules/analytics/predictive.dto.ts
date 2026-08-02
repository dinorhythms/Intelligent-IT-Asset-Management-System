import { ApiProperty } from '@nestjs/swagger';

export class PredictivePayloadDto {
  @ApiProperty({ example: 'AST-1001' })
  assetId: string;

  @ApiProperty({ example: 0.7 })
  predictiveScore: number;

  @ApiProperty({ example: 'schedule' })
  maintenanceForecast: string;
}
