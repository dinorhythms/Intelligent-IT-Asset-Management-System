import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { PredictiveResultEntity } from '../analytics/predictive-result.entity';
import { AssetController } from './asset.controller';
import { AssetEntity } from './asset.entity';
import { AssetService } from './asset.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AssetEntity, PredictiveResultEntity]),
    AiModule,
  ],
  controllers: [AssetController],
  providers: [AssetService],
})
export class AssetModule {}
