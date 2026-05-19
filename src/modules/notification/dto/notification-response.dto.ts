import { NotificationStatus, NotificationType } from '../entities/notification.entity';

export class NotificationResponseDto {
  notificationId: string;
  userId: string;
  type: NotificationType;
  recipient: string;
  message: string;
  scheduledAt: Date;
  status: NotificationStatus;
  failureReason?: string;
  attemptCount: number;
  lastAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
