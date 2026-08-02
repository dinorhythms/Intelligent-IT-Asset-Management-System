import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ example: 'admin123' })
  password: string;

  @ApiProperty({ example: 'admin', enum: ['admin', 'technician', 'manager'] })
  role: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  username: string;

  @ApiProperty({ example: 'admin123' })
  password: string;
}
