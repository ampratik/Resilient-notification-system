import { Injectable, Logger } from '@nestjs/common';

export enum ProviderResponse {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
}

export class ProviderException extends Error {
  constructor(
    public response: ProviderResponse,
    message: string,
  ) {
    super(message);
  }
}

@Injectable()
export class ExternalProviderService {
  private readonly logger = new Logger(ExternalProviderService.name);

  async sendNotification(
    notificationId: string,
    recipient: string,
    message: string,
  ): Promise<void> {
    const random = Math.random();

    // Simulate different responses: 60% success, 15% failure, 15% timeout, 10% rate limit
    if (random < 0.6) {
      this.logger.log(
        `[${notificationId}] Notification sent successfully to ${recipient}`,
      );
      return;
    }

    if (random < 0.75) {
      throw new ProviderException(
        ProviderResponse.FAILURE,
        `Failed to send notification to ${recipient}`,
      );
    }

    if (random < 0.9) {
      throw new ProviderException(
        ProviderResponse.TIMEOUT,
        `Request timeout while sending notification to ${recipient}`,
      );
    }

    throw new ProviderException(
      ProviderResponse.RATE_LIMIT,
      'Rate limit exceeded on external API',
    );
  }
}
