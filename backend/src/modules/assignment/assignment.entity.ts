import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('assignments')
export class AssignmentEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  assignmentId: string;

  @Column()
  assetId: string;

  @Column({ nullable: true })
  assetName: string;

  @Column({ nullable: true })
  userId: number;

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

  @Column({ type: 'timestamp', nullable: true })
  returnedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
