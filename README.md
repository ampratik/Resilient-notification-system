# Resilient Notification System

A resilient notification pipeline built with NestJS, BullMQ, Redis, and PostgreSQL.

This project handles asynchronous notification delivery with the following capabilities:
- queue-based job processing
- exponential backoff retry
- dead letter queue (DLQ)
- rate limiting
- business-hour scheduling
- idempotency protection
- queue dashboard monitoring

## Architecture

```
Client/API --> NotificationController --> NotificationService --> BullMQ Queue
                                      |                                |
                                      v                                v
                                  PostgreSQL                     NotificationProcessor
                                                                   /      |      \
                                                                  /       |       \
                                                      Time windows  Rate limit  Dispatch
```

### System flow
1. Client sends `POST /notifications/enqueue`
2. Controller forwards request to `NotificationService`
3. Service validates input and saves a database record with status `QUEUED`
4. Job is added to the `notifications` BullMQ queue
5. `NotificationProcessor` reads jobs and executes the workflow
6. If the external send fails, BullMQ retries with exponential backoff
7. After max retries, failed jobs land in `notifications-dlq`
8. Users can inspect and retry DLQ jobs from the API or dashboard

## Core Features

- **Queue-based processing** using BullMQ and Redis
- **Exponential backoff retry** (default 5 attempts)
- **Dead letter queue** for permanent failures
- **Rate limiting** (default 5 requests per second)
- **Time window enforcement** (default 8 AM - 9 PM)
- **Idempotency checks** to avoid duplicate processing
- **Persistence** of notification states in PostgreSQL
- **Dashboard monitoring** at `/admin/queues`

## Project Structure

```
src/
├── config/
│   ├── configuration.ts          # env and default settings
│   ├── database.ts               # TypeORM DB config
│   └── queue.ts                  # BullMQ queue config
├── modules/
│   ├── external/
│   │   └── external-provider.service.ts  # mock external send
│   └── notification/
│       ├── dto/
│       │   ├── create-notification.dto.ts
│       │   └── notification-response.dto.ts
│       ├── dispatchers/
│       │   └── notification.dispatcher.ts
│       ├── entities/
│       │   └── notification.entity.ts
│       ├── handlers/
│       │   ├── billing-reminder.handler.ts
│       │   ├── payment-receipt.handler.ts
│       │   └── subscription-alert.handler.ts
│       ├── processors/
│       │   └── notification.processor.ts
│       ├── repositories/
│       │   └── notification.repository.ts
│       ├── services/
│       │   ├── bull-board.service.ts
│       │   ├── idempotency.service.ts
│       │   ├── logger.service.ts
│       │   ├── rate-limiter.service.ts
│       │   └── time-window.service.ts
│       ├── notification.controller.ts
│       ├── notification.module.ts
│       └── notification.service.ts
├── app.module.ts
└── main.ts
```

## Important files

- `src/main.ts` — starts the Nest app and exposes Bull Board at `/admin/queues`
- `src/app.module.ts` — root module wiring DB, queue, and notification module
- `src/modules/notification/notification.service.ts` — enqueue and retry orchestration
- `src/modules/notification/processors/notification.processor.ts` — worker processing logic
- `src/modules/notification/services/bull-board.service.ts` — queue dashboard integration

## Environment Variables

Defaults are defined in `src/config/configuration.ts`. The following values are supported:

- `PORT` — API port (`3000`)
- `DATABASE_HOST` — Postgres host (`localhost`)
- `DATABASE_PORT` — Postgres port (`5432`)
- `DATABASE_USER` — Postgres user (`postgres`)
- `DATABASE_PASSWORD` — Postgres password (`postgres`)
- `DATABASE_NAME` — Postgres database name (`notification_db`)
- `REDIS_HOST` — Redis host (`localhost`)
- `REDIS_PORT` — Redis port (`6379`)
- `NOTIFICATION_MAX_RETRIES` — retry count (`5`)
- `NOTIFICATION_BASE_DELAY` — base retry delay in ms (`2000`)
- `BUSINESS_HOURS_START` — processing start hour (`8`)
- `BUSINESS_HOURS_END` — processing end hour (`21`)
- `RATE_LIMIT_PER_SECOND` — rate limit per second (`5`)

## Setup

```bash
cd Resilient-notification-system
npm install
```

Start Redis and PostgreSQL with Docker Compose:

```bash
docker-compose up -d
```

Start the application:

```bash
npm run start:dev
```

Or build and run production:

```bash
npm run build
npm run start:prod
```

## API Reference

### Enqueue a notification

```bash
curl -X POST http://localhost:3000/notifications/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "BILLING_REMINDER",
    "recipient": "user@example.com",
    "message": "Your invoice is due on Dec 31, 2024",
    "scheduledAt": "2024-12-20T10:00:00Z",
    "metadata": {
      "invoiceAmount": 124.99,
      "invoiceId": "INV-2026-001",
      "dueDate": "2024-12-31"
    }
  }'
```

### Get notification status

```bash
curl http://localhost:3000/notifications/<notificationId>
```

### List notifications

```bash
curl "http://localhost:3000/notifications?limit=20&offset=0"
```

### List failed notifications

```bash
curl http://localhost:3000/notifications/failed/list
```

### Retry a failed notification

```bash
curl -X POST http://localhost:3000/notifications/failed/<notificationId>/retry
```

## Supported notification payloads

### Billing Reminder

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "BILLING_REMINDER",
  "recipient": "user@example.com",
  "message": "Your invoice is due soon.",
  "scheduledAt": "2024-12-20T10:00:00Z",
  "metadata": {
    "invoiceAmount": 124.99,
    "invoiceId": "INV-2026-001",
    "dueDate": "2024-12-31"
  }
}
```

### Payment Receipt

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "PAYMENT_RECEIPT",
  "recipient": "user@example.com",
  "message": "Your payment was received.",
  "scheduledAt": "2024-12-20T11:00:00Z",
  "metadata": {
    "transactionId": "TX-2026-123",
    "amount": 199.99,
    "paymentDate": "2024-12-19",
    "paymentMethod": "Credit Card"
  }
}
```

### Subscription Alert

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "SUBSCRIPTION_ALERT",
  "recipient": "user@example.com",
  "message": "Your subscription status changed.",
  "scheduledAt": "2024-12-20T12:00:00Z",
  "metadata": {
    "subscriptionId": "SUB-2026-001",
    "plan": "Pro",
    "event": "RENEWAL",
    "renewalDate": "2025-12-20",
    "price": 29.99
  }
}
```

## Dashboard

Open the queue dashboard after the app starts:

```
http://localhost:3000/admin/queues
```

It shows both queues:
- `notifications`
- `notifications-dlq`

## Testing

### End-to-end script

Run:

```bash
node scripts/e2e-notification-test.js
```

This script sends sample payloads for all supported notification types and waits for each job to complete.

### Manual testing

Use curl or Postman to call the API endpoints above.

### Notes

There are Jest scripts configured in `package.json`, but no `.spec.ts` test files currently exist in the repository.

## Cleaned documentation

This `README.md` now contains the full consolidated project documentation, including structure, flow, setup, testing, and dashboard usage.
