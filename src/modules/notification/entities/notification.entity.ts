import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  DEFERRED = 'DEFERRED',
}

export enum NotificationType {
  BILLING_REMINDER = 'BILLING_REMINDER',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  SUBSCRIPTION_ALERT = 'SUBSCRIPTION_ALERT',
}

@Entity('notifications')
@Index(['userId', 'status'])
@Index(['createdAt'])
@Index(['status'])
export class Notification {
  @PrimaryColumn('uuid')
  notificationId: string;

  @Column('uuid')
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column()
  recipient: string;

  @Column('text')
  message: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.QUEUED,
  })
  status: NotificationStatus;

  @Column({ nullable: true })
  failureReason?: string;

  @Column({ default: 0 })
  attemptCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
