#!/usr/bin/env node

const baseUrl = process.env.NOTIFICATION_BASE_URL || 'http://localhost:3001';
const notifications = [
  {
    userId: '11111111-1111-4111-8111-111111111111',
    type: 'BILLING_REMINDER',
    recipient: 'billing@example.com',
    message: 'Your invoice is due soon. Please review the details.',
    scheduledAt: new Date().toISOString(),
    metadata: {
      invoiceAmount: 124.99,
      invoiceId: 'INV-2026-001',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  },
  {
    userId: '22222222-2222-4222-8222-222222222222',
    type: 'PAYMENT_RECEIPT',
    recipient: 'payment@example.com',
    message: 'Your payment has been processed.',
    scheduledAt: new Date().toISOString(),
    metadata: {
      transactionId: 'TX-2026-123',
      amount: 199.99,
      paymentDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Credit Card',
    },
  },
  {
    userId: '33333333-3333-4333-8333-333333333333',
    type: 'SUBSCRIPTION_ALERT',
    recipient: 'subscription@example.com',
    message: 'Your subscription status has changed.',
    scheduledAt: new Date().toISOString(),
    metadata: {
      subscriptionId: 'SUB-2026-001',
      plan: 'Pro',
      event: 'RENEWAL',
      renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 29.99,
    },
  },
];

async function postNotification(notification) {
  const response = await fetch(`${baseUrl}/notifications/enqueue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to enqueue ${notification.type}: ${response.status} ${response.statusText} - ${body}`);
  }
  return response.json();
}

async function getNotification(id) {
  const response = await fetch(`${baseUrl}/notifications/${id}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch notification ${id}: ${response.status} ${response.statusText} - ${body}`);
  }
  return response.json();
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCompletion(notificationId, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const notification = await getNotification(notificationId);
    if (notification.status !== 'QUEUED' && notification.status !== 'PROCESSING') {
      return notification;
    }
    await sleep(2000);
  }
  throw new Error(`Timeout waiting for notification ${notificationId}`);
}

(async () => {
  console.log('Starting end-to-end notification test...');
  console.log(`Using base URL: ${baseUrl}`);

  try {
    for (const notification of notifications) {
      const result = await postNotification(notification);
      console.log(`Enqueued ${notification.type}: ${result.notificationId}`);
      const finalStatus = await waitForCompletion(result.notificationId);
      console.log(`Result for ${result.notificationId}: ${finalStatus.status}`);
      if (finalStatus.failureReason) {
        console.log(`  Failure reason: ${finalStatus.failureReason}`);
      }
      console.log('---');
    }
    console.log('End-to-end notification test completed.');
  } catch (error) {
    console.error('E2E test failed:', error);
    process.exit(1);
  }
})();
