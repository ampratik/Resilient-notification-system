import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationProcessor } from './processors/notification.processor';
import { ExternalProviderService } from '../external/external-provider.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { TimeWindowService } from './services/time-window.service';
import { IdempotencyService } from './services/idempotency.service';
import { NotificationLoggerService } from './services/logger.service';
import { getNotificationQueueConfig } from '../../config/queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    BullModule.registerQueueAsync({
      name: 'notifications',
      useFactory: getNotificationQueueConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationProcessor,
    ExternalProviderService,
    RateLimiterService,
    TimeWindowService,
    IdempotencyService,
    NotificationLoggerService,
  ],
  exports: [NotificationService, NotificationLoggerService],
})
export class NotificationModule {}