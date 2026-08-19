import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('service_info')
export class ServiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  vendorId: string;

  @Column({ nullable: true })
  serviceManager: string;

  @Column({ type: 'date', nullable: true })
  serviceDate: string;

  @Column({ type: 'date', nullable: true })
  expectedReturnDate: string;

  @Column({ nullable: true })
  technician: string;

  @Column({ type: 'float', nullable: true })
  cost: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'float', nullable: true })
  predictiveImpact: number;

  @Column({ default: true })
  dashboardView: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
