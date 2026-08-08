import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('asset_request')
export class RequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  requestNo: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  assetName: string;

  @Column({ nullable: true })
  assetType: string;

  @Column({ nullable: true })
  assetIdentifier: string;

  @Column({ default: 1 })
  qty: number;

  @Column({ nullable: true })
  vendorName: string;

  @Column({ default: 'pending' })
  approvalStatus: string;

  @Column({ default: 'open' })
  requestStatus: string;

  @Column({ default: 'normal' })
  requestPriority: string;

  @Column({ nullable: true })
  requestedBy: string;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  rejectedBy: string;

  @Column({ type: 'text', nullable: true })
  reviewComment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
