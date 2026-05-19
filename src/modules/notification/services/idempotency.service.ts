import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private redis: Redis;
  private readonly IDEMPOTENCY_KEY_PREFIX = 'idempotency:notification:';

  constructor(private configService: ConfigService) {
    const redisConfig = {
      host: this.configService.get('redis.host'),
      port: this.configService.get('redis.port'),
    };
    this.redis = new Redis(redisConfig);
  }

  private getKey(notificationId: string, attemptNumber: number): string {
    return `${this.IDEMPOTENCY_KEY_PREFIX}${notificationId}:${attemptNumber}`;
  }

  async markProcessed(
    notificationId: string,
    attemptNumber: number,
    ttlSeconds: number = 86400, // 24 hours default
  ): Promise<void> {
    const key = this.getKey(notificationId, attemptNumber);
    await this.redis.setex(key, ttlSeconds, '1');
    this.logger.debug(
      `[${notificationId}] Marked as processed for attempt ${attemptNumber}`,
    );
  }

  async isProcessed(
    notificationId: string,
    attemptNumber: number,
  ): Promise<boolean> {
    const key = this.getKey(notificationId, attemptNumber);
    const result = await this.redis.get(key);
    const isProcessed = result === '1';

    if (isProcessed) {
      this.logger.warn(
        `[${notificationId}] Duplicate processing detected for attempt ${attemptNumber}`,
      );
    }

    return isProcessed;
  }

  async cleanup(notificationId: string, attemptNumber: number): Promise<void> {
    const key = this.getKey(notificationId, attemptNumber);
    await this.redis.del(key);
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}
