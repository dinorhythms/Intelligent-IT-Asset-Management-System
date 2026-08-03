import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiProperty({ example: 'AST-1002' }) assetId: string;
  @ApiProperty({ example: 'Dell Precision 7780' }) assetName: string;
  @ApiProperty({ example: 'IT-001' }) assetIdentifier: string;
  @ApiProperty({ example: 'Laptop' }) assetType: string;
  @ApiProperty({ example: 'active' }) assetStatus: string;
  @ApiPropertyOptional({ example: 'deployment' }) assetLifecycle?: string;
  @ApiPropertyOptional({ example: 'Dell' }) manufacturer?: string;
  @ApiPropertyOptional({ example: 'Lagos data centre' }) assetLocation?: string;
  @ApiPropertyOptional({ example: 540 }) usage_hours?: number;
  @ApiPropertyOptional({ example: 88 }) temperature?: number;
  @ApiPropertyOptional({ example: 94 }) cpu_usage?: number;
  @ApiPropertyOptional({ example: 4.6 }) vibration?: number;
  @ApiPropertyOptional({ example: 0.9 }) load_factor?: number;
  @ApiPropertyOptional({ example: 4 }) years_operation?: number;
}

export class UpdateAssetDto extends PartialType(CreateAssetDto) {}

export class ScanAssetDto {
  @ApiProperty({ example: 'AST-1002' }) assetIdentifier: string;
}
