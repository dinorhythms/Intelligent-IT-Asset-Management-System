import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  actor: string;

  @Column({ nullable: true })
  user: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  entityType: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @CreateDateColumn()
  createdAt: Date;
}
