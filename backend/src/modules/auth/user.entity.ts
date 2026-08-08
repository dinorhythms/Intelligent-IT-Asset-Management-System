import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  otherNames: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column()
  passwordHash: string;

  @Column({ default: 'staff' })
  role: string;

  @Column({ nullable: true })
  lastLogin: Date;

  @Column({ default: 'active' })
  loginStatus: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
