import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'jane.doe' })
  username?: string;

  @ApiPropertyOptional({ example: 'secret123' })
  password?: string;

  @ApiProperty({ example: 'jane@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'Jane' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'Oluwaseun' })
  otherNames?: string;

  @ApiPropertyOptional({ example: 'Finance' })
  department?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  location?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  phoneNumber?: string;

  @ApiProperty({ example: 'staff', enum: ['admin', 'technician', 'staff'] })
  role?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  email?: string;

  @ApiProperty({ example: 'admin123' })
  password: string;
}
