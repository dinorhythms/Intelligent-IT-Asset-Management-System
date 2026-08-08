import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../auth/user.entity';
import { SettingsEntity } from '../settings/settings.entity';
import { MailerService } from './mailer.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, SettingsEntity])],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
