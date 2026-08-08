import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vendors')
export class VendorEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  vendorId: string;

  @Column()
  vendorName: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  email: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
