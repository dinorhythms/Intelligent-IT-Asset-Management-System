import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async register(body: any) {
    const passwordHash = await bcrypt.hash(body.password || 'password123', 10);
    const user = this.userRepository.create({
      username: body.username,
      passwordHash,
      role: body.role || 'technician',
      loginStatus: 'active',
    });
    await this.userRepository.save(user);
    return {
      message: 'User registered',
      user: { username: user.username, role: user.role },
    };
  }

  async login(body: any) {
    const user = await this.userRepository.findOne({
      where: { username: body.username },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(body.password || '', user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    user.lastLogin = new Date();
    user.loginStatus = 'active';
    await this.userRepository.save(user);

    const payload = { sub: user.id, username: user.username, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        username: user.username,
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
    return {
      username: entry?.username,
      role: entry?.role,
      lastLogin: entry?.lastLogin,
      loginStatus: entry?.loginStatus,
    };
  }
}
