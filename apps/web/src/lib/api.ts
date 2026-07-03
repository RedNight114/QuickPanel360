import { clearAccessLinkToken, clearStoredAuth, readStoredAuth } from './auth';
import { isEmergencyError, isMaintenanceError } from './errors';
import type { ApiErrorBody } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

type ApiFetchOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  token?: string | null;
};

let authRedirectInFlight = false;
let emergencyRedirectInFlight = false;
let maintenanceRedirectInFlight = false;

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody | null;

  constructor(status: number, body: ApiErrorBody | null) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : body?.message || body?.error || `Error HTTP ${status}`;

    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function safeJsonParse(text: string) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function redirectToLogin() {
  if (typeof window === 'undefined' || authRedirectInFlight) {
    return;
  }

  authRedirectInFlight = true;
  clearStoredAuth();
  clearAccessLinkToken();
  window.location.href = '/login?reason=session-expired';
}

function redirectToEmergencyLocked() {
  if (typeof window === 'undefined' || emergencyRedirectInFlight) {
    return;
  }

  emergencyRedirectInFlight = true;
  clearStoredAuth();
  clearAccessLinkToken();
  window.location.href = '/emergency-locked';
}

function redirectToMaintenance() {
  if (typeof window === 'undefined' || maintenanceRedirectInFlight) {
    return;
  }

  maintenanceRedirectInFlight = true;
  window.location.href = '/maintenance';
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const storedAuth = readStoredAuth();
  const token = options.token ?? storedAuth?.accessToken;
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    throw error;
  }

  const text = await response.text();
  const payload = safeJsonParse(text) as ApiErrorBody | null;

  if (!response.ok) {
    const apiError = new ApiError(response.status, payload);

    if (response.status === 401) {
      redirectToLogin();
    }

    if (response.status === 503 && isMaintenanceError(apiError)) {
      redirectToMaintenance();
    }

    if (response.status === 403 && isEmergencyError(apiError)) {
      redirectToEmergencyLocked();
    }

    throw apiError;
  }

  return (payload ?? null) as T;
}

export function getJson<T>(path: string, options: ApiFetchOptions = {}) {
  return apiFetch<T>(path, { ...options, method: 'GET' });
}

export function postJson<T>(
  path: string,
  body?: unknown,
  options: ApiFetchOptions = {},
) {
  return apiFetch<T>(path, { ...options, method: 'POST', body });
}

export function patchJson<T>(
  path: string,
  body?: unknown,
  options: ApiFetchOptions = {},
) {
  return apiFetch<T>(path, { ...options, method: 'PATCH', body });
}

export function putJson<T>(
  path: string,
  body?: unknown,
  options: ApiFetchOptions = {},
) {
  return apiFetch<T>(path, { ...options, method: 'PUT', body });
}

export function deleteJson<T = void>(
  path: string,
  options: ApiFetchOptions = {},
) {
  return apiFetch<T>(path, { ...options, method: 'DELETE' });
}
