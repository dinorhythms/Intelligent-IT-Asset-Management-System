import { ApiProperty } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiProperty({ example: 'REQ-1002' })
  requestNo: string;

  @ApiProperty({ example: 'Printer' })
  assetName: string;

  @ApiProperty({ example: 'Hardware' })
  assetType: string;

  @ApiProperty({ example: 'IT-PRINT-01' })
  assetIdentifier: string;

  @ApiProperty({ example: 2 })
  qty: number;

  @ApiProperty({ example: 'urgent' })
  requestPriority: string;
}
