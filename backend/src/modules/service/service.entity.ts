import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('service_info')
export class ServiceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  serviceId: string;

  @Column()
  serviceDesc: string;

  @Column({ nullable: true })
  servicePortfolio: string;

  @Column({ nullable: true })
  serviceStatus: string;

  @Column({ nullable: true })
  assetId: string;

  @Column({ nullable: true })
  serviceManager: string;

  @Column({ type: 'float', nullable: true })
  predictiveImpact: number;

  @Column({ default: true })
  dashboardView: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
