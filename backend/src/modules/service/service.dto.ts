import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'SRV-2002' }) serviceId: string;
  @ApiProperty({ example: 'Preventive maintenance' }) serviceDesc: string;
  @ApiProperty({ example: 'AST-1002' }) assetId: string;
  @ApiPropertyOptional({ example: 'VEND-001' }) vendorId?: string;
  @ApiProperty({ example: '2026-08-02', format: 'date' }) serviceDate: string;
  @ApiProperty({ example: 'Ada Okafor' }) technician: string;
  @ApiProperty({ example: 125000 }) cost: number;
  @ApiProperty({ example: 'Replaced fan and cleaned vents.' }) notes: string;
  @ApiPropertyOptional({ example: 'Infrastructure' }) servicePortfolio?: string;
  @ApiPropertyOptional({ example: 'completed' }) serviceStatus?: string;
  @ApiPropertyOptional({ example: 540 }) usage_hours?: number;
  @ApiPropertyOptional({ example: 90 }) maintenance_interval_days?: number;
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}
