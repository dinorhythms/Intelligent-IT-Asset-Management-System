import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AssetEntity } from '../asset/asset.entity';
import { ServiceController } from './service.controller';
import { ServiceEntity } from './service.entity';
import { ServiceService } from './service.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceEntity, AssetEntity]),
    AiModule,
  ],
  controllers: [ServiceController],
  providers: [ServiceService],
})
export class ServiceModule {}
