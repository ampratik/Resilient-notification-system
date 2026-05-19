import { Logger } from '@nestjs/common';
import { ExternalProviderService } from '../../external/external-provider.service';
import { NotificationLoggerService } from '../services/logger.service';

export interface PaymentReceiptPayload {
  notificationId: string;
  userId: string;
  recipient: string;
  transactionId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}

export class PaymentReceiptHandler {
  private readonly logger = new Logger(PaymentReceiptHandler.name);

  constructor(
    private externalProvider: ExternalProviderService,
    private notificationLogger: NotificationLoggerService,
  ) {}

  async handle(payload: PaymentReceiptPayload): Promise<void> {
    const {
      notificationId,
      recipient,
      transactionId,
      amount,
      paymentDate,
      paymentMethod,
    } = payload;

    this.logger.log(
      `[${notificationId}] Processing PAYMENT_RECEIPT for transaction ${transactionId}`,
    );

    // Format receipt message
    const message = this.formatReceiptMessage(
      transactionId,
      amount,
      paymentDate,
      paymentMethod,
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
      `[${notificationId}] PAYMENT_RECEIPT sent successfully`,
    );
  }

  private formatReceiptMessage(
    transactionId: string,
    amount: number,
    paymentDate: string,
    paymentMethod: string,
  ): string {
    return `✅ Payment Received\n\nTransaction ID: ${transactionId}\nAmount: $${amount.toFixed(2)}\nDate: ${paymentDate}\nMethod: ${paymentMethod}\n\nThank you for your payment!`;
  }
}
