import { Injectable, Logger } from '@nestjs/common';

export enum LogEventType {
  JOB_STARTED = 'job_started',
  JOB_PROCESSING = 'job_processing',
  JOB_SUCCESS = 'job_success',
  JOB_RETRY = 'job_retry',
  JOB_FAILED = 'job_failed',
  RATE_LIMIT_HIT = 'rate_limit_hit',
  TIME_WINDOW_DEFERRED = 'time_window_deferred',
  IDEMPOTENCY_DUPLICATE = 'idempotency_duplicate',
}

export interface LogEvent {
  type: LogEventType;
  notificationId: string;
  userId?: string;
  recipient?: string;
  attemptCount?: number;
  message?: string;
  error?: string;
  timestamp: Date;
}

@Injectable()
export class NotificationLoggerService {
  private readonly logger = new Logger(NotificationLoggerService.name);
  private events: LogEvent[] = [];

  logEvent(event: Omit<LogEvent, 'timestamp'>): void {
    const logEntry: LogEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(logEntry);

    const logMessage = this.formatLogMessage(logEntry);
    switch (event.type) {
      case LogEventType.JOB_SUCCESS:
        this.logger.log(logMessage);
        console.log(logMessage);
        break;
      case LogEventType.JOB_FAILED:
      case LogEventType.RATE_LIMIT_HIT:
        this.logger.warn(logMessage);
        console.warn(logMessage);
        break;
      case LogEventType.JOB_RETRY:
        this.logger.debug(logMessage);
        console.debug(logMessage);
        break;
      default:
        this.logger.log(logMessage);
        console.log(logMessage);
    }
  }

  private formatLogMessage(event: LogEvent): string {
    const base = `[${event.notificationId}]`;
    let msg = base;

    switch (event.type) {
      case LogEventType.JOB_STARTED:
        msg += ` Job started for user ${event.userId} (${event.recipient})`;
        break;
      case LogEventType.JOB_PROCESSING:
        msg += ` Processing started. Attempt ${event.attemptCount}`;
        break;
      case LogEventType.JOB_SUCCESS:
        msg += ` Successfully sent to ${event.recipient}`;
        break;
      case LogEventType.JOB_RETRY:
        msg += ` Retrying (attempt ${event.attemptCount}). Reason: ${event.message}`;
        break;
      case LogEventType.JOB_FAILED:
        msg += ` Failed permanently. ${event.error}`;
        break;
      case LogEventType.RATE_LIMIT_HIT:
        msg += ` Rate limit exceeded`;
        break;
      case LogEventType.TIME_WINDOW_DEFERRED:
        msg += ` Deferred - outside business hours`;
        break;
      case LogEventType.IDEMPOTENCY_DUPLICATE:
        msg += ` Duplicate processing detected`;
        break;
    }

    return msg;
  }

  getAllEvents(): LogEvent[] {
    return [...this.events];
  }

  getEventsByNotificationId(notificationId: string): LogEvent[] {
    return this.events.filter((e) => e.notificationId === notificationId);
  }

  clearEvents(): void {
    this.events = [];
  }
}
