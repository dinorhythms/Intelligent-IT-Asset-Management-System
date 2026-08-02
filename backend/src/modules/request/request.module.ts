import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { AssetEntity } from '../asset/asset.entity';
import { RequestController } from './request.controller';
import { RequestEntity } from './request.entity';
import { RequestService } from './request.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RequestEntity, AssetEntity]),
    AiModule,
  ],
  controllers: [RequestController],
  providers: [RequestService],
})
export class RequestModule {}
