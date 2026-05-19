import { Logger } from '@nestjs/common';
import { ExternalProviderService } from '../../external/external-provider.service';
import { NotificationLoggerService } from '../services/logger.service';

export interface BillingReminderPayload {
  notificationId: string;
  userId: string;
  recipient: string;
  invoiceAmount: number;
  invoiceId: string;
  dueDate: string;
}

export class BillingReminderHandler {
  private readonly logger = new Logger(BillingReminderHandler.name);

  constructor(
    private externalProvider: ExternalProviderService,
    private notificationLogger: NotificationLoggerService,
  ) {}

  async handle(payload: BillingReminderPayload): Promise<void> {
    const { notificationId, recipient, invoiceAmount, invoiceId, dueDate } =
      payload;

    this.logger.log(
      `[${notificationId}] Processing BILLING_REMINDER for invoice ${invoiceId}`,
    );

    // Format the message based on billing reminder rules
    const message = this.formatBillingMessage(invoiceAmount, invoiceId, dueDate);

    this.logger.debug(
      `[${notificationId}] Formatted message: ${message.substring(0, 50)}...`,
    );

    // Send via external provider
    await this.externalProvider.sendNotification(
      notificationId,
      recipient,
      message,
    );

    this.logger.log(`[${notificationId}] BILLING_REMINDER sent successfully`);
  }

  private formatBillingMessage(
    amount: number,
    invoiceId: string,
    dueDate: string,
  ): string {
    return `📋 Billing Reminder\n\nInvoice #${invoiceId}\nAmount: $${amount.toFixed(2)}\nDue Date: ${dueDate}\n\nPlease pay as soon as possible.`;
  }
}
