import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Notification } from './entities/notification.entity';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationProcessor } from './processors/notification.processor';
import { NotificationDispatcher } from './dispatchers/notification.dispatcher';
import { ExternalProviderService } from '../external/external-provider.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { TimeWindowService } from './services/time-window.service';
import { IdempotencyService } from './services/idempotency.service';
import { NotificationLoggerService } from './services/logger.service';
import { BullBoardService } from './services/bull-board.service';
import { getNotificationQueueConfig } from '../../config/queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    BullModule.registerQueueAsync({
      name: 'notifications',
      useFactory: getNotificationQueueConfig,
      inject: [ConfigService],
    }),
    BullModule.registerQueueAsync({
      name: 'notifications-dlq',
      useFactory: getNotificationQueueConfig,
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationProcessor,
    NotificationDispatcher,
    ExternalProviderService,
    RateLimiterService,
    TimeWindowService,
    IdempotencyService,
    NotificationLoggerService,
    BullBoardService,
  ],
  exports: [NotificationService, NotificationLoggerService],
})
export class NotificationModule {}