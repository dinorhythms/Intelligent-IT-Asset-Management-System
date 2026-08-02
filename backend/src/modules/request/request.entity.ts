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

  @Column()
  assetName: string;

  @Column()
  assetType: string;

  @Column()
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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
