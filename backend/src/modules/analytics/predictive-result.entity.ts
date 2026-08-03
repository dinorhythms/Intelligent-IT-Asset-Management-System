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

  @Column({ nullable: true })
  requestNo: string;

  @Column({ type: 'float', default: 0 })
  predictiveScore: number;

  @Column({ default: 'monitor' })
  maintenanceForecast: string;

  @Column({ default: false })
  anomalyDetected: boolean;

  @Column({ type: 'jsonb', nullable: true })
  recommendedActions: unknown;

  @Column({ type: 'date', nullable: true })
  nextMaintenanceDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
