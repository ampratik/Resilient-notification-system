import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RateLimitedException extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
  }
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private tokens: number;
  private lastRefillTime: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(private configService: ConfigService) {
    this.maxTokens = this.configService.get<number>('notification.rateLimitPerSecond') || 5;
    this.refillRate = this.maxTokens / 1000; // tokens per millisecond
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  async acquire(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens < tokens) {
      this.logger.warn(
        `Rate limit exceeded. Available: ${this.tokens.toFixed(2)}, Required: ${tokens}`,
      );
      throw new RateLimitedException(
        `Insufficient tokens. Available: ${this.tokens.toFixed(2)}, Required: ${tokens}`,
      );
    }

    this.tokens -= tokens;
  }

  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }
}
