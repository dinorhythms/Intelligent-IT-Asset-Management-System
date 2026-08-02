import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asset_details')
export class AssetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  assetId: string;

  @Column()
  assetName: string;

  @Column({ nullable: true })
  assetIdentifier: string;

  @Column({ nullable: true })
  assetType: string;

  @Column({ nullable: true })
  assetStatus: string;

  @Column({ nullable: true })
  assetLifecycle: string;

  @Column({ nullable: true })
  manufacturer: string;

  @Column({ nullable: true })
  assetLocation: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ type: 'float', nullable: true })
  predictiveScore: number;

  @Column({ type: 'date', nullable: true })
  nextMaintenanceDate: string;

  @Column({ type: 'float', nullable: true })
  usageHours: number;

  @Column({ type: 'float', nullable: true })
  temperature: number;

  @Column({ type: 'float', nullable: true })
  cpuUsage: number;

  @Column({ type: 'float', nullable: true })
  vibration: number;

  @Column({ type: 'float', nullable: true })
  loadFactor: number;

  @Column({ type: 'float', nullable: true })
  yearsOperation: number;

  @Column({ default: true })
  dashboardView: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
