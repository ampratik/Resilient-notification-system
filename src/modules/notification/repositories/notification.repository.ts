import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Notification, NotificationStatus } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository extends Repository<Notification> {
  constructor(private dataSource: DataSource) {
    super(Notification, dataSource.createEntityManager());
  }

  async findByNotificationId(notificationId: string): Promise<Notification | null> {
    return this.findOne({ where: { notificationId } });
  }

  async updateStatus(
    notificationId: string,
    status: NotificationStatus,
    failureReason?: string,
  ): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    await this.update({ notificationId }, updateData);
  }

  async incrementAttemptCount(notificationId: string): Promise<void> {
    await this.update(
      { notificationId },
      {
        attemptCount: () => 'attemptCount + 1',
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      },
    );
  }

  async findFailedNotifications(limit: number = 100): Promise<Notification[]> {
    return this.find({
      where: { status: NotificationStatus.FAILED },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findDeferredNotifications(): Promise<Notification[]> {
    return this.find({
      where: { status: NotificationStatus.DEFERRED },
      order: { createdAt: 'ASC' },
    });
  }
}
