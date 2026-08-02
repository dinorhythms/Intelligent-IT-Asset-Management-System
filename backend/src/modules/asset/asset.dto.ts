import { ApiProperty } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiProperty({ example: 'AST-1002' })
  assetId: string;

  @ApiProperty({ example: 'Dell Precision 7780' })
  assetName: string;

  @ApiProperty({ example: 'IT-001' })
  assetIdentifier: string;

  @ApiProperty({ example: 'Laptop' })
  assetType: string;

  @ApiProperty({ example: 'active' })
  assetStatus: string;

  @ApiProperty({ example: 'deployment' })
  assetLifecycle: string;
}
