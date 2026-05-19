import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../entities/notification.entity';
import { ExternalProviderService } from '../../external/external-provider.service';
import { NotificationLoggerService } from '../services/logger.service';
import {
  BillingReminderHandler,
  BillingReminderPayload,
} from '../handlers/billing-reminder.handler';
import {
  PaymentReceiptHandler,
  PaymentReceiptPayload,
} from '../handlers/payment-receipt.handler';
import {
  SubscriptionAlertHandler,
  SubscriptionAlertPayload,
} from '../handlers/subscription-alert.handler';

export type NotificationPayload =
  | BillingReminderPayload
  | PaymentReceiptPayload
  | SubscriptionAlertPayload;

@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);
  private billingHandler: BillingReminderHandler;
  private paymentHandler: PaymentReceiptHandler;
  private subscriptionHandler: SubscriptionAlertHandler;

  constructor(
    private externalProvider: ExternalProviderService,
    private notificationLogger: NotificationLoggerService,
  ) {
    this.billingHandler = new BillingReminderHandler(
      externalProvider,
      notificationLogger,
    );
    this.paymentHandler = new PaymentReceiptHandler(
      externalProvider,
      notificationLogger,
    );
    this.subscriptionHandler = new SubscriptionAlertHandler(
      externalProvider,
      notificationLogger,
    );
  }

  async dispatch(
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    const notificationId = payload.notificationId;

    this.logger.log(
      `[${notificationId}] Dispatching notification type: ${type}`,
    );

    switch (type) {
      case NotificationType.BILLING_REMINDER:
        return this.billingHandler.handle(payload as BillingReminderPayload);

      case NotificationType.PAYMENT_RECEIPT:
        return this.paymentHandler.handle(payload as PaymentReceiptPayload);

      case NotificationType.SUBSCRIPTION_ALERT:
        return this.subscriptionHandler.handle(payload as SubscriptionAlertPayload);

      default:
        const error = `Unknown notification type: ${type}`;
        this.logger.error(`[${notificationId}] ${error}`);
        throw new Error(error);
    }
  }
}
