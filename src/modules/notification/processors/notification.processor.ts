import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { NotificationDispatcher } from '../dispatchers/notification.dispatcher';
import { RateLimiterService, RateLimitedException } from '../services/rate-limiter.service';
import { TimeWindowService } from '../services/time-window.service';
import { IdempotencyService } from '../services/idempotency.service';
import { NotificationLoggerService, LogEventType } from '../services/logger.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationStatus, NotificationType } from '../entities/notification.entity';

interface NotificationJobPayload {
  notificationId: string;
  userId: string;
  type: NotificationType;
  recipient: string;
  message?: string;
  scheduledAt: Date;
  metadata: Record<string, any>; // Contains type-specific fields
}

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private dispatcher: NotificationDispatcher,
    private rateLimiter: RateLimiterService,
    private timeWindow: TimeWindowService,
    private idempotency: IdempotencyService,
    private notificationLogger: NotificationLoggerService,
    private notificationRepository: NotificationRepository,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const { notificationId, userId, type, recipient, metadata } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    this.notificationLogger.logEvent({
      type: LogEventType.JOB_STARTED,
      notificationId,
      userId,
      recipient,
      attemptCount: attemptNumber,
      notificationType: type,
    });

    // Check for duplicate processing
    if (await this.idempotency.isProcessed(notificationId, attemptNumber)) {
      this.notificationLogger.logEvent({
        type: LogEventType.IDEMPOTENCY_DUPLICATE,
        notificationId,
        notificationType: type,
      });
      return;
    }

    // Mark as processed immediately for idempotency
    await this.idempotency.markProcessed(notificationId, attemptNumber);

    // Check time window
    if (!this.timeWindow.isWithinBusinessHours()) {
      this.timeWindow.logWindowStatus(notificationId, false);
      this.notificationLogger.logEvent({
        type: LogEventType.TIME_WINDOW_DEFERRED,
        notificationId,
        notificationType: type,
      });

      // Update status to DEFERRED
      const nextBusinessHour = this.timeWindow.getNextBusinessHourTime();
      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.DEFERRED,
      );

      // Reschedule job for next business hour
      const delayMs =
        nextBusinessHour.getTime() - Date.now() + 60000; // Add 1 min buffer
      throw job.moveToDelayed(Date.now() + delayMs);
    }

    this.timeWindow.logWindowStatus(notificationId, true);

    try {
      // Update status to PROCESSING
      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.PROCESSING,
      );

      this.notificationLogger.logEvent({
        type: LogEventType.JOB_PROCESSING,
        notificationId,
        attemptCount: attemptNumber,
        notificationType: type,
      });

      // Check rate limit
      try {
        await this.rateLimiter.acquire(1);
      } catch (error) {
        if (error instanceof RateLimitedException) {
          this.notificationLogger.logEvent({
            type: LogEventType.RATE_LIMIT_HIT,
            notificationId,
            attemptCount: attemptNumber,
            notificationType: type,
          });

          // Retry with exponential backoff
          throw error;
        }
        throw error;
      }

      // Dispatch to appropriate handler based on notification type
      const payload = {
        notificationId,
        userId,
        recipient,
        ...metadata, // Spread type-specific fields
      };

      await this.dispatcher.dispatch(type, payload);

      // Mark as SUCCESS
      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.SUCCESS,
      );

      this.notificationLogger.logEvent({
        type: LogEventType.JOB_SUCCESS,
        notificationId,
        attemptCount: attemptNumber,
        notificationType: type,
      });
    } catch (error) {
      // Increment attempt count
      await this.notificationRepository.incrementAttemptCount(notificationId);

      const retriesLeft = (job.opts.attempts || 5) - job.attemptsMade - 1;
      if (retriesLeft > 0) {
        this.notificationLogger.logEvent({
          type: LogEventType.JOB_RETRY,
          notificationId,
          attemptCount: attemptNumber,
          message: error.message,
          notificationType: type,
        });

        // Re-throw to trigger BullMQ retry
        throw error;
      }

      // No more retries - mark as FAILED
      await this.notificationRepository.updateStatus(
        notificationId,
        NotificationStatus.FAILED,
        error.message || 'Unknown error',
      );

      this.notificationLogger.logEvent({
        type: LogEventType.JOB_FAILED,
        notificationId,
        attemptCount: attemptNumber,
        error: error.message,
        notificationType: type,
      });

      throw error; // Still throw to track in BullMQ failed jobs
    }
  }

  @OnWorkerEvent('active')
  onActive(job: Job): void {
    const payload = job.data as NotificationJobPayload;
    this.logger.debug(
      `Job ${job.id} started processing (type: ${payload.type})`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job): void {
    const payload = job.data as NotificationJobPayload;
    this.logger.log(
      `Job ${job.id} completed successfully (type: ${payload.type})`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error): void {
    const payload = job.data as NotificationJobPayload;
    this.logger.error(
      `Job ${job.id} failed: ${err.message} (type: ${payload.type})`,
    );
  }
}
