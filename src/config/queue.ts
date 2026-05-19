import { ConfigService } from '@nestjs/config';
import Bull from 'bullmq';

export const getBullConfig = (configService: ConfigService) => {
  const redisConfig: Bull.RedisOptions = {
    host: configService.get<string>('redis.host') || 'localhost',
    port: configService.get<number>('redis.port') || 6379,
  };

  return {
    connection: redisConfig,
  };
};

export const getNotificationQueueConfig = (
  configService: ConfigService,
): Bull.QueueOptions => {
  const redisConfig: Bull.RedisOptions = {
    host: configService.get<string>('redis.host') || 'localhost',
    port: configService.get<number>('redis.port') || 6379,
  };

  return {
    connection: redisConfig,
    defaultJobOptions: {
      attempts: configService.get<number>('notification.maxRetries') || 5,
      backoff: {
        type: 'exponential',
        delay: configService.get<number>('notification.baseDelayMs') || 2000,
      },
      removeOnComplete: true,
      removeOnFail: true,
    },
  };
};
