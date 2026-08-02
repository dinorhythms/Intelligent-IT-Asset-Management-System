import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('ai_service_results')
export class AiResultEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  kind: string;

  @Column({ nullable: true })
  assetId: string;

  @Column({ type: 'jsonb', nullable: true })
  requestPayload: any;

  @Column({ type: 'jsonb', nullable: true })
  responsePayload: any;

  @CreateDateColumn()
  createdAt: Date;
}
