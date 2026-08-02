import { ApiProperty } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'SRV-2002' })
  serviceId: string;

  @ApiProperty({ example: 'Software maintenance' })
  serviceDesc: string;

  @ApiProperty({ example: 'Infrastructure' })
  servicePortfolio: string;

  @ApiProperty({ example: 'active' })
  serviceStatus: string;
}
