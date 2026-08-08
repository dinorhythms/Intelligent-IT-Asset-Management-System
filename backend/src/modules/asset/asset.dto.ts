import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiPropertyOptional({ example: 'LAPTOP-001' }) assetId?: string;
  @ApiPropertyOptional({ example: 'Dell Latitude 7420' }) assetName?: string;
  @ApiPropertyOptional({ example: 'Laptop', enum: ['Laptop', 'Printer', 'Server'] })
  category?: string;
  @ApiPropertyOptional({ example: 'Dell' }) make?: string;
  @ApiPropertyOptional({ example: 'Latitude 7420' }) model?: string;
  @ApiPropertyOptional({ example: 'SN-1234-5678' }) serialNumber?: string;
  @ApiPropertyOptional({ example: 'AA:BB:CC:DD:EE:FF' }) macAddress?: string;
  @ApiPropertyOptional({ example: 'Dell EMEA' }) vendor?: string;
  @ApiPropertyOptional({ example: 'VEND-001' }) vendorId?: string;
  @ApiPropertyOptional({ example: 1250000 }) cost?: number;
  @ApiPropertyOptional({ example: '2026-01-15' }) deliveryDate?: string;
  @ApiPropertyOptional({ example: 'admin' }) receivedBy?: string;
  @ApiPropertyOptional({ example: '3 years' }) warranty?: string;
  @ApiPropertyOptional({ example: 'Available', enum: ['Available', 'Assigned', 'Returned'] })
  assetStatus?: string;
  @ApiPropertyOptional({ example: 'active' }) assetType?: string;
  @ApiPropertyOptional({ example: 'IT-001' }) assetIdentifier?: string;
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
  @ApiProperty({ example: 'LAPTOP-001' }) assetIdentifier: string;
}
