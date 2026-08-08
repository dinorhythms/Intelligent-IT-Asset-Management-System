import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiPropertyOptional({ example: 'VEND-001' }) vendorId?: string;
  @ApiProperty({ example: 'Dell EMEA' }) vendorName: string;
  @ApiPropertyOptional({ example: 'Jane Okafor' }) contactPerson?: string;
  @ApiPropertyOptional({ example: '+2348012345678' }) phoneNumber?: string;
  @ApiPropertyOptional({ example: 'sales@dell.ng' }) email?: string;
  @ApiPropertyOptional({ example: 'Lagos, Nigeria' }) address?: string;
  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  status?: string;
}

export class UpdateVendorDto extends PartialType(CreateVendorDto) {}
