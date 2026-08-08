import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'text', nullable: true })
  value: string;
}
