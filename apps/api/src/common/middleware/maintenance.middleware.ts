import {
  Injectable,
  type NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

const ALLOWED_PATHS = ['/health', '/ready', '/version', '/favicon.ico'];

const MAINTENANCE_MESSAGE =
  'QuickPanel360 está en mantenimiento temporal. Estamos realizando mejoras en el sistema. Por favor, inténtelo de nuevo en unos minutos.';

function isAllowed(path: string): boolean {
  return ALLOWED_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const envActive = process.env.MAINTENANCE_MODE === 'true';

    if (!envActive) {
      return next();
    }

    if (isAllowed(req.path)) {
      return next();
    }

    const estimatedEnd = process.env.MAINTENANCE_ESTIMATED_END;

    res.setHeader('Retry-After', '300');
    res.setHeader('Cache-Control', 'no-store');

    const body: Record<string, unknown> = {
      statusCode: 503,
      message: process.env.MAINTENANCE_MESSAGE || MAINTENANCE_MESSAGE,
      maintenance: true,
    };

    if (estimatedEnd) {
      body.estimatedEnd = estimatedEnd;
    }

    res.status(503).json(body);
  }
}
