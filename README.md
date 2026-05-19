# Resilient Notification System

A production-grade notification system built with NestJS, BullMQ, Redis, and PostgreSQL. Designed to handle unreliable external APIs with automatic retries, rate limiting, idempotency, and time window enforcement.

## Architecture

### System Overview

```
┌─────────────┐
│   API       │ (REST endpoints to enqueue notifications)
│ Controller  │
└──────┬──────┘
       │
       ▼
┌──────────────────┐     ┌─────────────┐
│ Notification     │────▶│ PostgreSQL  │ (Persistence)
│ Service          │     │ Database    │
└──────┬───────────┘     └─────────────┘
       │
       ▼
┌──────────────────┐
│ BullMQ Queue     │
│ (Redis Backend)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Notification Processor (Worker)              │
│                                              │
│  1. Check Time Window (9 PM - 8 AM defer)   │
│  2. Check Rate Limiter (5 req/sec)          │
│  3. Verify Idempotency                      │
│  4. Send via External Provider              │
│  5. Handle Retries with Exponential Backoff │
│  6. Log all events                          │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ External API Provider   │
│ (Mock with failures)    │
└─────────────────────────┘
```

## Key Features

### 1. **Resilience & Retry Logic**
- **Exponential Backoff**: Retries with increasing delays (2s, 4s, 8s, 16s, 32s)
- **Max Retries**: 5 attempts before marking as failed
- **Dead Letter Queue**: Failed jobs tracked for manual review

### 2. **Rate Limiting**
- **Token Bucket Pattern**: 5 requests per second limit
- **Smooth Throttling**: Prevents API overload
- **Automatic Retry**: Rate limit errors trigger exponential backoff

### 3. **Idempotency**
- **Notification ID Based**: Each notification has a unique ID
- **Attempt Tracking**: Prevents duplicate processing of same attempt
- **Redis Tracking**: Fast in-memory idempotency checks with TTL

### 4. **Time Window Enforcement**
- **Business Hours**: 8 AM - 9 PM (configurable)
- **Automatic Deferral**: Jobs outside hours are rescheduled
- **Smart Scheduling**: Next business hour calculated automatically

### 5. **Comprehensive Logging**
Events tracked:
- `job_started`: When a notification job begins processing
- `job_processing`: Attempt started
- `job_success`: Successfully sent
- `job_retry`: Retry attempted due to failure
- `job_failed`: Permanently failed after all retries
- `rate_limit_hit`: Rate limit encountered
- `time_window_deferred`: Job deferred outside business hours
- `idempotency_duplicate`: Duplicate processing detected

### 6. **Persistent State Tracking**
Database stores:
- `QUEUED`: Awaiting processing
- `PROCESSING`: Currently being processed
- `SUCCESS`: Successfully sent
- `FAILED`: Failed permanently
- `DEFERRED`: Outside business hours, waiting for next window

## Setup Instructions

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone repository and install dependencies**
```bash
cd Resilient-notification-system
npm install
```

2. **Start PostgreSQL and Redis**
```bash
docker-compose up -d
```

3. **Configure environment variables**
```bash
# .env is already configured with defaults
# Modify if needed for your environment
cat .env
```

4. **Start the application**
```bash
# Development with hot reload
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`

## API Examples

### Enqueue a Notification

```bash
curl -X POST http://localhost:3000/notifications/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "BILLING_REMINDER",
    "recipient": "user@example.com",
    "message": "Your invoice is due on Dec 31, 2024",
    "scheduledAt": "2024-12-20T10:00:00Z"
  }'
```

**Response:**
```json
{
  "notificationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "BILLING_REMINDER",
  "recipient": "user@example.com",
  "message": "Your invoice is due on Dec 31, 2024",
  "scheduledAt": "2024-12-20T10:00:00Z",
  "status": "QUEUED",
  "attemptCount": 0,
  "createdAt": "2024-12-19T14:30:00Z",
  "updatedAt": "2024-12-19T14:30:00Z"
}
```

### Get Notification Status

```bash
curl http://localhost:3000/notifications/f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Response:**
```json
{
  "notificationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "BILLING_REMINDER",
  "recipient": "user@example.com",
  "message": "Your invoice is due on Dec 31, 2024",
  "scheduledAt": "2024-12-20T10:00:00Z",
  "status": "SUCCESS",
  "attemptCount": 1,
  "lastAttemptAt": "2024-12-20T10:00:05Z",
  "createdAt": "2024-12-19T14:30:00Z",
  "updatedAt": "2024-12-20T10:00:05Z"
}
```

### List Notifications

```bash
# Get first 20 notifications
curl http://localhost:3000/notifications?limit=20&offset=0

# Get next 20
curl http://localhost:3000/notifications?limit=20&offset=20
```

### Get Failed Notifications

```bash
curl http://localhost:3000/notifications/failed/list?limit=50
```

## Configuration

All settings are configured via `.env` file:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=notification_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Notification Settings
NOTIFICATION_MAX_RETRIES=5          # Number of retry attempts
NOTIFICATION_BASE_DELAY=2000        # Base retry delay in ms
BUSINESS_HOURS_START=8              # Start of business hours (24-hour format)
BUSINESS_HOURS_END=21               # End of business hours
RATE_LIMIT_PER_SECOND=5             # Max requests per second
```

## Notification Types

- `BILLING_REMINDER`: Payment reminders and billing notifications
- `PAYMENT_RECEIPT`: Confirmation of successful payments
- `SUBSCRIPTION_ALERT`: Subscription status changes and alerts

## Retry Strategy

### How Retries Work

1. **Initial Attempt**: Job added to queue, processed immediately (or at scheduled time)
2. **Failure**: If API fails, error is caught and job enters retry queue
3. **Exponential Backoff**: Each retry has increasing delay
4. **Max Retries**: After 5 failed attempts, job marked as FAILED

### Backoff Formula

```
delay_ms = base_delay * 2^(attempt_number - 1)

Example with 2000ms base delay:
- Attempt 1 (failure): Wait 2 seconds
- Attempt 2 (failure): Wait 4 seconds
- Attempt 3 (failure): Wait 8 seconds
- Attempt 4 (failure): Wait 16 seconds
- Attempt 5 (failure): Wait 32 seconds
- Final failure: Marked FAILED, added to dead-letter queue
```

### Error Handling

| Error Type | Behavior |
|----------|----------|
| Network Timeout | Retry with backoff |
| Rate Limit (429) | Retry with exponential backoff |
| API Failure | Retry with exponential backoff |
| Invalid Input | Fail immediately (no retry) |

## Idempotency

### Problem It Solves

Without idempotency, a network glitch or process restart could cause:
- Same notification sent twice
- Duplicate charges
- User receiving duplicate messages

### Solution

The system uses **notification ID + attempt number** as idempotency key:

```
Idempotency Key: "idempotency:notification:550e8400-e29b-41d4-a716-446655440000:1"
TTL: 24 hours
```

When processing:
1. Check Redis for idempotency key
2. If exists (duplicate) → skip processing
3. If not exists → mark as processed, proceed
4. TTL ensures old keys eventually expire

### Benefits

✅ Safe to replay failed jobs  
✅ Network glitches don't cause duplicates  
✅ System restarts won't cause re-processing  
✅ Cross-instance retry-safety

## Time Window Enforcement

### Why It's Needed

- Avoid sending notifications outside business hours
- Prevent overwhelming users with night-time notifications
- Comply with communication policies

### How It Works

```
Current Time → Outside business hours (9 PM - 8 AM)?
  ├─ YES → Calculate next business hour
  │        Update status to DEFERRED
  │        Reschedule job for next business hour
  │        Return from processing
  └─ NO  → Continue with normal processing
```

### Example

```
Scenario: Job scheduled for 11:30 PM

1. Worker receives job at 11:30 PM
2. Checks time window: 11:30 PM is outside 8 AM - 9 PM ❌
3. Calculates next business hour: 8:00 AM tomorrow
4. Sets job status to DEFERRED
5. Reschedules job to tomorrow 8:00 AM
6. Next morning at 8:00 AM, job processes normally ✓
```

## Production Trade-offs & Decisions

### 1. **Redis + PostgreSQL**
- **Why two databases?**
  - Redis: Fast queue operations, job state, rate limiting
  - PostgreSQL: Audit trail, reporting, compliance
- **Trade-off**: Slight complexity for better scalability & durability

### 2. **Exponential Backoff**
- **Why not linear?**
  - Exponential prevents hammering failing APIs
  - Gives external system time to recover
- **Cost**: Slower initial retries

### 3. **Token Bucket Rate Limiting**
- **Why not sliding window?**
  - Simpler, deterministic, no overhead
  - Good enough for most cases
- **Limitation**: Less precise at boundaries

### 4. **Idempotency via Redis**
- **Why Redis, not database?**
  - Faster checks (millisecond-level)
  - TTL automatically cleanup
- **Trade-off**: Memory usage vs. speed (24-hour TTL acceptable)

### 5. **BullMQ (not Kafka/RabbitMQ)**
- **Why BullMQ?**
  - Built-in retry with exponential backoff
  - Simpler setup for smaller scale
  - Redis backend = one less service
- **Limitations**: Single region only (no federation)

### 6. **Synchronous Processing**
- **Why not async events?**
  - Simpler, easier to reason about
  - Natural retry flow
- **Limitation**: Max throughput ~5 req/sec (by design)

## Monitoring & Observability

### Key Metrics to Track

```typescript
- Success rate: (SUCCESS count / total) * 100
- Failure rate: (FAILED count / total) * 100
- Avg retry count: sum(attempts) / count
- Rate limit hits: Events with RATE_LIMIT_HIT
- Time window deferrals: Events with TIME_WINDOW_DEFERRED
- Processing latency: (currentTime - scheduledAt)
```

### Logging Format

```json
{
  "type": "job_success",
  "notificationId": "f47ac10b-...",
  "userId": "550e8400-...",
  "recipient": "user@example.com",
  "attemptCount": 2,
  "timestamp": "2024-12-20T10:00:05Z"
}
```

## Testing

### Run Tests

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

### Manual Testing Flow

1. **Start services**
```bash
docker-compose up -d
npm run start:dev
```

2. **Create test notification**
```bash
curl -X POST http://localhost:3000/notifications/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "type": "BILLING_REMINDER",
    "recipient": "test@example.com",
    "message": "Test notification",
    "scheduledAt": "2024-12-20T10:00:00Z"
  }'
```

3. **Monitor processing**
```bash
# Check status
curl http://localhost:3000/notifications/{notificationId}

# Watch logs
docker logs -f notification_redis
docker logs -f notification_postgres
```

4. **Verify database state**
```bash
docker exec -it notification_postgres psql -U postgres -d notification_db \
  -c "SELECT * FROM notifications;"
```

## Troubleshooting

### Issue: Jobs stuck in PROCESSING

**Cause**: Worker crashed mid-processing  
**Solution**: BullMQ automatically recovers stalled jobs after 30 seconds

### Issue: Database connection refused

**Cause**: PostgreSQL container not running  
**Solution**: 
```bash
docker-compose up -d postgres
# Wait 10 seconds for startup
npm run start:dev
```

### Issue: Rate limits not working

**Cause**: Multiple workers (tokens reset each time)  
**Solution**: Use Redis-based rate limiter for multi-process (current implementation is per-process)

### Issue: High latency spikes

**Cause**: Exponential backoff delays during high failure rates  
**Solution**: Check external API health, increase NOTIFICATION_MAX_RETRIES if needed

## Project Structure

```
src/
├── config/
│   ├── configuration.ts       # Env config loading
│   ├── database.ts            # TypeORM config
│   └── queue.ts               # BullMQ config
├── modules/
│   ├── notification/
│   │   ├── dto/
│   │   │   ├── create-notification.dto.ts
│   │   │   └── notification-response.dto.ts
│   │   ├── entities/
│   │   │   └── notification.entity.ts
│   │   ├── repositories/
│   │   │   └── notification.repository.ts
│   │   ├── services/
│   │   │   ├── rate-limiter.service.ts
│   │   │   ├── time-window.service.ts
│   │   │   ├── idempotency.service.ts
│   │   │   └── logger.service.ts
│   │   ├── processors/
│   │   │   └── notification.processor.ts
│   │   ├── notification.controller.ts
│   │   ├── notification.service.ts
│   │   └── notification.module.ts
│   └── external/
│       └── external-provider.service.ts
├── app.controller.ts
├── app.service.ts
├── app.module.ts
└── main.ts

docker-compose.yml            # Services (PostgreSQL, Redis)
.env                          # Environment variables
package.json
tsconfig.json
```

## Acceptance Criteria Met

✅ Jobs queued & processed correctly  
✅ Retries + delays work (exponential backoff)  
✅ No duplicates (idempotency enforcement)  
✅ Rate limits respected (5 req/sec)  
✅ Time window enforced (9 PM - 8 AM deferred)  
✅ States persisted (QUEUED, PROCESSING, SUCCESS, FAILED, DEFERRED)  
✅ Failures traceable (comprehensive logging)  

## Next Steps for Production

1. **Add authentication** to API endpoints
2. **Implement metrics export** (Prometheus)
3. **Add health checks** for liveness/readiness
4. **Set up alerts** for high failure rates
5. **Add request validation** with more strict rules
6. **Implement distributed rate limiting** for multi-instance
7. **Add database migrations** (TypeORM migrations)
8. **Set up CI/CD** pipeline
9. **Add integration tests** with real services
10. **Performance tuning** based on load testing

## License

UNLICENSED
