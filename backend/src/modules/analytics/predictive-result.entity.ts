import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('predictive_results')
export class PredictiveResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assetId: string;

  @Column({ type: 'float', default: 0 })
  predictiveScore: number;

  @Column({ default: 'monitor' })
  maintenanceForecast: string;

  @Column({ default: false })
  anomalyDetected: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
