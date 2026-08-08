import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assignments')
export class AssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  assignmentId: string;

  @Column()
  assetId: string;

  @Column({ nullable: true })
  assetName: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column()
  userName: string;

  @Column({ nullable: true })
  userDisplayName: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  assignedBy: string;

  @Column({ default: 'assigned' })
  status: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ nullable: true })
  returnInitiatedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  returnInitiatedAt: Date;

  @Column({ type: 'text', nullable: true })
  returnReason: string;

  @Column({ nullable: true })
  returnConfirmedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  returnConfirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
