import { Logger } from '@nestjs/common';
import { ExternalProviderService } from '../../external/external-provider.service';
import { NotificationLoggerService } from '../services/logger.service';

export enum SubscriptionEvent {
  RENEWAL = 'RENEWAL',
  EXPIRY_WARNING = 'EXPIRY_WARNING',
  RENEWAL_FAILED = 'RENEWAL_FAILED',
  UPGRADED = 'UPGRADED',
  DOWNGRADED = 'DOWNGRADED',
  CANCELLED = 'CANCELLED',
}

export interface SubscriptionAlertPayload {
  notificationId: string;
  userId: string;
  recipient: string;
  subscriptionId: string;
  plan: string;
  event: SubscriptionEvent;
  expiryDate?: string;
  renewalDate?: string;
  price?: number;
}

export class SubscriptionAlertHandler {
  private readonly logger = new Logger(SubscriptionAlertHandler.name);

  constructor(
    private externalProvider: ExternalProviderService,
    private notificationLogger: NotificationLoggerService,
  ) {}

  async handle(payload: SubscriptionAlertPayload): Promise<void> {
    const {
      notificationId,
      recipient,
      subscriptionId,
      plan,
      event,
      expiryDate,
      renewalDate,
      price,
    } = payload;

    this.logger.log(
      `[${notificationId}] Processing SUBSCRIPTION_ALERT for subscription ${subscriptionId}, event: ${event}`,
    );

    // Format message based on event type
    const message = this.formatSubscriptionMessage(
      event,
      plan,
      expiryDate,
      renewalDate,
      price,
    );

    this.logger.debug(
      `[${notificationId}] Formatted message: ${message.substring(0, 50)}...`,
    );

    // Send via external provider
    await this.externalProvider.sendNotification(
      notificationId,
      recipient,
      message,
    );

    this.logger.log(
      `[${notificationId}] SUBSCRIPTION_ALERT sent successfully for event: ${event}`,
    );
  }

  private formatSubscriptionMessage(
    event: SubscriptionEvent,
    plan: string,
    expiryDate?: string,
    renewalDate?: string,
    price?: number,
  ): string {
    const messages: { [key in SubscriptionEvent]: string } = {
      [SubscriptionEvent.RENEWAL]: `🔄 Subscription Renewed\n\nPlan: ${plan}\nRenewal Date: ${renewalDate}\nPrice: $${price?.toFixed(2)}\n\nThank you for continuing with us!`,
      [SubscriptionEvent.EXPIRY_WARNING]: `⚠️ Subscription Expiring Soon\n\nPlan: ${plan}\nExpiry Date: ${expiryDate}\n\nRenew now to avoid service interruption.`,
      [SubscriptionEvent.RENEWAL_FAILED]: `❌ Subscription Renewal Failed\n\nPlan: ${plan}\nPlease update your payment method to continue service.`,
      [SubscriptionEvent.UPGRADED]: `⬆️ Subscription Upgraded\n\nNew Plan: ${plan}\nPrice: $${price?.toFixed(2)}\n\nYou now have access to premium features!`,
      [SubscriptionEvent.DOWNGRADED]: `⬇️ Subscription Downgraded\n\nNew Plan: ${plan}\nPrice: $${price?.toFixed(2)}\n\nYour plan has been successfully downgraded.`,
      [SubscriptionEvent.CANCELLED]: `🛑 Subscription Cancelled\n\nPlan: ${plan}\nYour subscription has been cancelled. You can resubscribe anytime.`,
    };

    return messages[event];
  }
}
