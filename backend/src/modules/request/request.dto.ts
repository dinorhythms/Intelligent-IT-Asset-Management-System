import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateRequestDto {
  @ApiPropertyOptional({ example: 'REQ-1002' }) requestNo?: string;
  @ApiProperty({ example: 'Laptop' }) category: string;
  @ApiPropertyOptional({ example: 1, minimum: 1 }) qty?: number;
  @ApiPropertyOptional({ example: 'normal', enum: ['normal', 'urgent'] })
  requestPriority?: string;
  @ApiPropertyOptional({
    example: 'I need a laptop for my new role.',
  })
  reason?: string;
  @ApiPropertyOptional() requestedBy?: string;
}

export class UpdateRequestDto extends PartialType(CreateRequestDto) {}
