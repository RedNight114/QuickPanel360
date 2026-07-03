import * as Sentry from '@sentry/node';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RedisIoAdapter } from './redis/redis-io.adapter';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

function corsOrigins() {
  const configured = process.env.CORS_ORIGIN;

  if (configured) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') {
    return [];
  }

  return [
    'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
    'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002',
  ];
}

async function bootstrap() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`FATAL: Missing required environment variable: ${key}`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS startup logs in production to avoid noise
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn', 'log']
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Enable graceful shutdown hooks (SIGTERM / SIGINT)
  app.enableShutdownHooks();

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
    try {
      await redisIoAdapter.connectToRedis();
      app.useWebSocketAdapter(redisIoAdapter);
      Logger.log('WebSocket using Redis adapter for multi-instance support', 'Bootstrap');
    } catch {
      Logger.warn(
        `Redis adapter failed (${redisUrl}) — WebSocket running in-memory mode. ` +
        'This is fine for single-instance dev but NOT for production with multiple API replicas.',
        'Bootstrap',
      );
    }
  } else {
    Logger.log('No REDIS_URL set — WebSocket running in-memory mode (single instance)', 'Bootstrap');
  }

  app.use(helmet());
  app.use(json({ limit: process.env.REQUEST_BODY_LIMIT ?? '1mb' }));
  app.use(
    urlencoded({
      extended: true,
      limit: process.env.REQUEST_BODY_LIMIT ?? '1mb',
    }),
  );
  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Application listening on port ${port}`, 'Bootstrap');

  if (process.env.MAINTENANCE_MODE === 'true') {
    Logger.warn('MAINTENANCE_MODE=true — all non-health endpoints are returning 503', 'Bootstrap');
  }
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});
