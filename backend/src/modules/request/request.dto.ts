import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({ example: 'REQ-1002' }) requestNo: string;
  @ApiProperty({ example: 'Printer' }) assetName: string;
  @ApiProperty({ example: 'Hardware' }) assetType: string;
  @ApiProperty({ example: 'AST-1002' }) assetIdentifier: string;
  @ApiPropertyOptional({ example: 2 }) qty?: number;
  @ApiPropertyOptional({ example: 'urgent' }) requestPriority?: string;
  @ApiPropertyOptional({ example: 'pending' }) approvalStatus?: string;
  @ApiPropertyOptional({ example: 'open' }) requestStatus?: string;
  @ApiPropertyOptional({ example: 540 }) usage_hours?: number;
  @ApiPropertyOptional({ example: 88 }) temperature?: number;
  @ApiPropertyOptional({ example: 94 }) cpu_usage?: number;
  @ApiPropertyOptional({ example: 4.6 }) vibration?: number;
  @ApiPropertyOptional({ example: 0.9 }) load_factor?: number;
  @ApiPropertyOptional({ example: 4 }) years_operation?: number;
}

export class UpdateRequestDto extends PartialType(CreateRequestDto) {}
