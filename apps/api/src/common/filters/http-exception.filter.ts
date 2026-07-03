import * as Sentry from '@sentry/node';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionBody = isHttpException ? exception.getResponse() : null;
    const normalized =
      typeof exceptionBody === 'string'
        ? { message: exceptionBody }
        : (exceptionBody as Record<string, unknown> | null);

    const message = this.resolveMessage(status, normalized);

    if (status >= 500) {
      Sentry.captureException(exception, {
        extra: { method: request.method, url: request.url, status },
      });
    }

    if (status >= 500 || process.env.NODE_ENV !== 'production') {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: this.resolveErrorLabel(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV !== 'production' && normalized?.message
        ? { details: normalized.message }
        : {}),
    });
  }

  private resolveMessage(
    status: number,
    body: Record<string, unknown> | null,
  ) {
    const rawMessage = body?.message;

    if (Array.isArray(rawMessage) && rawMessage.length > 0) {
      return rawMessage.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof rawMessage === 'string' && rawMessage.trim()) {
      return rawMessage.trim();
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      return 'Tu sesión ha caducado. Inicia sesión de nuevo.';
    }

    if (status === HttpStatus.FORBIDDEN) {
      return 'No tienes permiso para realizar esta acción.';
    }

    if (status === HttpStatus.NOT_FOUND) {
      return 'No se encontró la información solicitada.';
    }

    if (status === HttpStatus.CONFLICT) {
      return 'No se pudo completar porque hay un conflicto con los datos actuales.';
    }

    if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) {
      return 'Revisa los datos e inténtalo de nuevo.';
    }

    return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
  }

  private resolveErrorLabel(status: number) {
    if (status >= 500) {
      return 'Internal Server Error';
    }

    return HttpStatus[status] ?? 'Error';
  }
}
