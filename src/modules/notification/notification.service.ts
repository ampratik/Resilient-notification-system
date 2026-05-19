import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { v4 as uuidv4 } from 'uuid';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationRepository } from './repositories/notification.repository';
import { Notification, NotificationStatus } from './entities/notification.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue('notifications') private notificationQueue: Queue,
    private notificationRepository: NotificationRepository,
  ) {}

  async enqueueNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notificationId = uuidv4();

    // Save to database with QUEUED status
    const notification = new Notification();
    notification.notificationId = notificationId;
    notification.userId = createNotificationDto.userId;
    notification.type = createNotificationDto.type;
    notification.recipient = createNotificationDto.recipient;
    notification.message = createNotificationDto.message;
    notification.scheduledAt = createNotificationDto.scheduledAt;
    notification.status = NotificationStatus.QUEUED;
    notification.attemptCount = 0;

    const savedNotification = await this.notificationRepository.save(notification);

    // Enqueue job with scheduled time
    const delay = this.calculateDelay(createNotificationDto.scheduledAt);
    await this.notificationQueue.add(
      'send-notification',
      {
        notificationId,
        userId: createNotificationDto.userId,
        type: createNotificationDto.type,
        recipient: createNotificationDto.recipient,
        message: createNotificationDto.message,
        scheduledAt: createNotificationDto.scheduledAt,
      },
      {
        delay,
        jobId: notificationId,
      },
    );

    this.logger.log(
      `Notification ${notificationId} enqueued for user ${createNotificationDto.userId}`,
    );

    return this.mapToResponseDto(savedNotification);
  }

  async getNotification(notificationId: string): Promise<NotificationResponseDto | null> {
    const notification = await this.notificationRepository.findByNotificationId(
      notificationId,
    );

    if (!notification) {
      return null;
    }

    return this.mapToResponseDto(notification);
  }

  async getNotifications(
    limit: number = 20,
    offset: number = 0,
  ): Promise<{
    data: NotificationResponseDto[];
    total: number;
  }> {
    const [notifications, total] = await this.notificationRepository.findAndCount(
      {
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      },
    );

    return {
      data: notifications.map((n) => this.mapToResponseDto(n)),
      total,
    };
  }

  async getFailedNotifications(limit: number = 100): Promise<NotificationResponseDto[]> {
    const notifications = await this.notificationRepository.findFailedNotifications(
      limit,
    );
    return notifications.map((n) => this.mapToResponseDto(n));
  }

  private calculateDelay(scheduledAt: Date): number {
    const now = new Date();
    const delayMs = scheduledAt.getTime() - now.getTime();
    return Math.max(0, delayMs); // Ensure non-negative delay
  }

  private mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      notificationId: notification.notificationId,
      userId: notification.userId,
      type: notification.type,
      recipient: notification.recipient,
      message: notification.message,
      scheduledAt: notification.scheduledAt,
      status: notification.status,
      failureReason: notification.failureReason,
      attemptCount: notification.attemptCount,
      lastAttemptAt: notification.lastAttemptAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
