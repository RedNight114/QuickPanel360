import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID().slice(0, 8);
    const start = Date.now();

    (req as any).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { method, originalUrl } = req;
      const { statusCode } = res;

      this.metrics.record({
        method,
        path: originalUrl,
        status: statusCode,
        duration,
        timestamp: Date.now(),
      });

      if (originalUrl.startsWith('/health')) return;

      const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'log';
      this.logger[level](
        `${method} ${originalUrl} ${statusCode} ${duration}ms [${requestId}]`,
      );
    });

    next();
  }
}
