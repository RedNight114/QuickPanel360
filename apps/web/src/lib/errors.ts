import type { ApiErrorBody } from './types';

export type ParsedApiErrorKind =
  | 'auth'
  | 'permission'
  | 'validation'
  | 'network'
  | 'conflict'
  | 'not_found'
  | 'emergency'
  | 'maintenance'
  | 'module_disabled'
  | 'unknown';

export type ParsedApiError = {
  status?: number;
  message: string;
  kind: ParsedApiErrorKind;
  details?: string[];
  raw?: unknown;
};

type ApiLikeError = Error & {
  status?: number;
  body?: ApiErrorBody | null;
};

function normalizeMessage(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function getApiBody(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null;
  }

  return (error as ApiLikeError).body ?? null;
}

function getApiStatus(error: unknown) {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const status = (error as ApiLikeError).status;
  return typeof status === 'number' ? status : undefined;
}

function getBodyMessages(body: ApiErrorBody | null) {
  if (!body) {
    return [];
  }

  if (Array.isArray(body.message)) {
    return body.message.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof body.message === 'string' && body.message.trim()) {
    return [body.message.trim()];
  }

  if (typeof body.error === 'string' && body.error.trim()) {
    return [body.error.trim()];
  }

  return [];
}

function includesAny(text: string, patterns: string[]) {
  const normalized = text.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

export function isNetworkError(error: unknown) {
  if (!error) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }

  const status = getApiStatus(error);
  if (status === 0) {
    return true;
  }

  if (error instanceof TypeError) {
    return includesAny(error.message, [
      'failed to fetch',
      'networkerror',
      'load failed',
      'network request failed',
    ]);
  }

  return false;
}

export function isAuthError(error: unknown) {
  return getApiStatus(error) === 401;
}

export function isPermissionError(error: unknown) {
  return getApiStatus(error) === 403;
}

export function isValidationError(error: unknown) {
  const status = getApiStatus(error);
  return status === 400 || status === 422;
}

export function isMaintenanceError(error: unknown) {
  if (getApiStatus(error) !== 503) {
    return false;
  }
  const body = getApiBody(error) as (Record<string, unknown> | null);
  return body?.maintenance === true;
}

export function isEmergencyError(error: unknown) {
  if (getApiStatus(error) !== 403) {
    return false;
  }

  const message = normalizeMessage(getApiBody(error)?.message) || (error instanceof Error ? error.message : '');
  return includesAny(message, ['modo emergencia', 'acceso público está bloqueado', 'emergency']);
}

export function isModuleDisabledError(error: unknown) {
  const message = normalizeMessage(getApiBody(error)?.message) || (error instanceof Error ? error.message : '');
  return includesAny(message, ['módulo no disponible', 'módulo no está habilitado', 'module disabled']);
}

export function parseApiError(error: unknown): ParsedApiError {
  const status = getApiStatus(error);
  const body = getApiBody(error);
  const details = getBodyMessages(body);
  const rawMessage = normalizeMessage(details) || (error instanceof Error ? error.message : '');

  if (isMaintenanceError(error)) {
    return {
      status,
      kind: 'maintenance',
      message:
        (body as Record<string, unknown> | null)?.message as string ||
        'QuickPanel360 está en mantenimiento temporal.',
      details,
      raw: error,
    };
  }

  if (isEmergencyError(error)) {
    return {
      status,
      kind: 'emergency',
      message: 'El club está bloqueado por emergencia.',
      details,
      raw: error,
    };
  }

  if (isModuleDisabledError(error)) {
    return {
      status,
      kind: 'module_disabled',
      message: 'Este módulo no está habilitado para tu empresa.',
      details,
      raw: error,
    };
  }

  if (isAuthError(error)) {
    return {
      status,
      kind: 'auth',
      message: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
      details,
      raw: error,
    };
  }

  if (isPermissionError(error)) {
    return {
      status,
      kind: 'permission',
      message: 'No tienes permiso para realizar esta acción.',
      details,
      raw: error,
    };
  }

  if (status === 404) {
    return {
      status,
      kind: 'not_found',
      message: 'No se encontró la información solicitada.',
      details,
      raw: error,
    };
  }

  if (status === 409) {
    return {
      status,
      kind: 'conflict',
      message: 'No se pudo completar porque hay un conflicto con los datos actuales.',
      details,
      raw: error,
    };
  }

  if (isValidationError(error)) {
    return {
      status,
      kind: 'validation',
      message: rawMessage || 'Revisa los datos e inténtalo de nuevo.',
      details,
      raw: error,
    };
  }

  if (isNetworkError(error)) {
    return {
      status,
      kind: 'network',
      message: 'No se pudo conectar con el servidor.',
      details,
      raw: error,
    };
  }

  if (status && status >= 500) {
    return {
      status,
      kind: 'unknown',
      message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      details,
      raw: error,
    };
  }

  return {
    status,
    kind: 'unknown',
    message: rawMessage || 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    details,
    raw: error,
  };
}

export function getErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado. Inténtalo de nuevo.') {
  const parsed = parseApiError(error);
  return parsed.message || fallback;
}
