import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateDepartmentDto {
  @ApiPropertyOptional({ example: 'DEPT-001' }) departmentId?: string;
  @ApiProperty({ example: 'Finance' }) departmentName: string;
  @ApiPropertyOptional({ example: 'Handles accounts and budgeting' })
  description?: string;
  @ApiPropertyOptional({ example: 'active', enum: ['active', 'inactive'] })
  status?: string;
}

export class UpdateDepartmentDto extends PartialType(CreateDepartmentDto) {}
