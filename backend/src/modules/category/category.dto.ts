import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiPropertyOptional({ example: 'CAT-001' }) categoryId?: string;
  @ApiProperty({ example: 'Laptop' }) categoryName: string;
  @ApiPropertyOptional({ example: 'Portable computing devices' }) description?: string;
  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  status?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
