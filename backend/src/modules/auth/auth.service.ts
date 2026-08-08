import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { UserEntity } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  async register(body: any, actor?: string) {
    return this.usersService.create(body, actor);
  }

  async login(body: any) {
    const identifier = body.username || body.email;
    const user = await this.userRepository.findOne({
      where: [
        { username: identifier },
        ...(identifier && identifier.includes('@')
          ? [{ email: identifier } as any]
          : []),
      ],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(body.password || '', user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    user.lastLogin = new Date();
    user.loginStatus = 'active';
    await this.userRepository.save(user);
    await this.auditService.log('user.login', {
      actor: user.username,
      entityType: 'user',
      entityId: String(user.id),
    });

    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        otherNames: user.otherNames,
        department: user.department,
        location: user.location,
        phoneNumber: user.phoneNumber,
        role: user.role,
        lastLogin: user.lastLogin,
        loginStatus: user.loginStatus,
      },
    };
  }

  async logout(user: any) {
    const entry = await this.userRepository.findOne({
      where: { username: user.username },
    });
    if (entry) {
      entry.loginStatus = 'inactive';
      await this.userRepository.save(entry);
    }
    return { message: 'Logged out successfully' };
  }

  async me(user: any) {
    const entry = await this.userRepository.findOne({
      where: { username: user.username },
    });
    if (!entry) return null;
    const { passwordHash, ...safe } = entry;
    return safe;
  }
}
