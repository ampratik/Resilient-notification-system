export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'notification_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  notification: {
    maxRetries: parseInt(process.env.NOTIFICATION_MAX_RETRIES || '5', 10),
    baseDelayMs: parseInt(process.env.NOTIFICATION_BASE_DELAY || '2000', 10),
    businessHoursStart: parseInt(process.env.BUSINESS_HOURS_START || '8', 10),
    businessHoursEnd: parseInt(process.env.BUSINESS_HOURS_END || '21', 10),
    rateLimitPerSecond: parseInt(
      process.env.RATE_LIMIT_PER_SECOND || '5',
      10,
    ),
  },
  externalApi: {
    url: process.env.EXTERNAL_API_URL || 'http://localhost:3001/send',
    timeout: parseInt(process.env.EXTERNAL_API_TIMEOUT || '5000', 10),
  },
});
