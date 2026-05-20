# Project File Summary

This document explains what each file and folder does in the notification system repository.

## Root files

- `.env`
  - Optional environment overrides for local development.
- `.gitignore`
  - Defines files and folders that Git should ignore.
- `.prettierrc`
  - Prettier formatter configuration.
- `docker-compose.yml`
  - Starts Redis and PostgreSQL for the app using Docker.
- `eslint.config.mjs`
  - ESLint configuration for project linting.
- `nest-cli.json`
  - Nest CLI configuration for build and project settings.
- `package.json`
  - Project scripts, dependencies, and devDependencies.
- `package-lock.json`
  - Locked npm dependency tree.
- `README.md`
  - Main project documentation and usage instructions.
- `resiliant-notification-system.postman_collection.json`
  - Postman collection for API testing.
- `scripts/`
  - Custom scripts folder. It contains end-to-end test helpers or other automation.
- `tsconfig.json`
  - TypeScript compiler settings for development.
- `tsconfig.build.json`
  - TypeScript settings used during build.
- `dist/`
  - Generated JavaScript output when the project is built.
- `node_modules/`
  - Installed npm dependencies.

## `src/`

### `src/main.ts`
- Application bootstrap file.
- Creates the Nest application.
- Registers a global validation pipe.
- Mounts Bull Board dashboard at `/admin/queues`.
- Starts the HTTP server on `PORT` or `3000`.

### `src/app.module.ts`
- Root Nest module.
- Loads configuration, TypeORM, BullMQ, and the notification module.
- Registers `AppController` and `AppService`.

### `src/app.controller.ts`
- Defines a simple root route `GET /`.
- Returns a `Hello World!` response.

### `src/app.service.ts`
- Provides the simple `getHello()` helper used by `AppController`.

### `src/config/configuration.ts`
- Defines environment configuration values.
- Provides defaults for database, Redis, retry settings, business hours, and external API.

### `src/config/database.ts`
- Builds TypeORM connection options from configuration.
- Connects to Postgres and registers the `Notification` entity.
- Enables schema synchronization in this setup.

### `src/config/queue.ts`
- Builds BullMQ configuration for Redis connection.
- Defines default queue options for retries, exponential backoff, and cleanup behavior.

## `src/modules/external/`

### `src/modules/external/external-provider.service.ts`
- Simulates an external notification provider.
- Randomly returns success, failure, timeout, or rate-limit behavior.
- Throws `ProviderException` for simulated failures.

## `src/modules/notification/`

### `src/modules/notification/notification.module.ts`
- Registers the notification feature module.
- Imports the `Notification` TypeORM entity.
- Registers two BullMQ queues: `notifications` and `notifications-dlq`.
- Registers notification controllers, services, processors, and helpers.

### `src/modules/notification/notification.controller.ts`
- Exposes REST endpoints for notifications.
- Endpoints:
  - `POST /notifications/enqueue`
  - `GET /notifications/:id`
  - `GET /notifications`
  - `GET /notifications/failed/list`
  - `POST /notifications/failed/:id/retry`

### `src/modules/notification/notification.service.ts`
- Orchestrates notification creation and query operations.
- Saves notifications to Postgres.
- Enqueues jobs in the `notifications` queue.
- Retrieves notification status and lists.
- Pulls failed jobs from the DLQ queue.
- Retries DLQ jobs by re-enqueuing them and cleaning DLQ entries.

### `src/modules/notification/repositories/notification.repository.ts`
- Custom repository for the `Notification` entity.
- Provides helpers to find by ID, update statuses, and increment attempt counters.

### `src/modules/notification/processors/notification.processor.ts`
- Defines the BullMQ worker for `notifications`.
- Processes jobs with idempotency, rate limiting, time-window checks, and dispatch logic.
- Marks notifications as `SUCCESS`, `FAILED`, or `DEFERRED`.
- Moves permanently failed jobs to the `notifications-dlq` queue.

### `src/modules/notification/dispatchers/notification.dispatcher.ts`
- Routes notifications to the correct handler based on type.
- Supports `BILLING_REMINDER`, `PAYMENT_RECEIPT`, and `SUBSCRIPTION_ALERT`.
- Throws an error for unknown notification types.

### `src/modules/notification/handlers/billing-reminder.handler.ts`
- Formats billing reminder notification content.
- Sends the formatted message using the external provider.

### `src/modules/notification/handlers/payment-receipt.handler.ts`
- Formats payment receipt notification content.
- Sends the formatted message using the external provider.

### `src/modules/notification/handlers/subscription-alert.handler.ts`
- Formats subscription alert content for different subscription events.
- Sends the formatted message using the external provider.

### `src/modules/notification/services/bull-board.service.ts`
- Configures Bull Board dashboard integration.
- Exposes queue monitoring UI for `notifications` and `notifications-dlq`.

### `src/modules/notification/services/idempotency.service.ts`
- Uses Redis to record processed notification attempts.
- Prevents duplicate job execution for the same notification attempt.
- Keeps a short-lived key per `notificationId` and attempt.

### `src/modules/notification/services/logger.service.ts`
- Centralizes notification event logging.
- Formats and logs events such as job start, retry, success, failure, and rate limit hits.
- Stores events in memory for later retrieval if needed.

### `src/modules/notification/services/rate-limiter.service.ts`
- Implements a token bucket style rate limiter.
- Controls how many notifications can be processed per second.
- Throws `RateLimitedException` when the rate limit is exceeded.

### `src/modules/notification/services/time-window.service.ts`
- Checks whether current time is within configured business hours.
- Calculates the next valid processing time when outside working hours.
- Logs when jobs are deferred because of time window restrictions.

### `src/modules/notification/dto/create-notification.dto.ts`
- Defines the request validation schema for enqueueing notifications.
- Validates `userId`, `type`, `recipient`, `message`, `scheduledAt`, and optional metadata.

### `src/modules/notification/dto/notification-response.dto.ts`
- Defines the API response shape for notifications.
- Includes status, failure reason, attempt count, and timestamps.

### `src/modules/notification/entities/notification.entity.ts`
- Defines the `notifications` database table structure.
- Includes fields for notification metadata, status, attempts, and timestamps.
- Uses enums for notification type and status.

## `scripts/`

- `scripts/e2e-notification-test.js`
  - End-to-end script that sends sample notifications to the running API.
  - Waits for each notification to complete, then prints final status.

## How this project works together

1. `src/main.ts` boots Nest.
2. `src/app.module.ts` loads configuration, Postgres, Redis/Bull, and the notification module.
3. `NotificationController` accepts incoming requests.
4. `NotificationService` saves notifications and enqueues jobs.
5. `NotificationProcessor` consumes jobs from the `notifications` queue.
6. `NotificationDispatcher` chooses the correct handler.
7. The chosen handler formats a message and calls `ExternalProviderService`.
8. Failures trigger retries; permanent failures are moved to `notifications-dlq`.
9. Bull Board at `/admin/queues` shows queue state and job details.

---