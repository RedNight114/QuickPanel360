import type { StoredAuth } from './types';

export const AUTH_STORAGE_KEY = 'cannaclub.auth';
export const ACCESS_LINK_STORAGE_KEY = 'cannaclub.accessLinkToken';

export function readStoredAuth(): StoredAuth | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function writeStoredAuth(auth: StoredAuth) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function readAccessLinkToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(ACCESS_LINK_STORAGE_KEY);
}

export function writeAccessLinkToken(token: string) {
  window.localStorage.setItem(ACCESS_LINK_STORAGE_KEY, token);
}

export function clearAccessLinkToken() {
  window.localStorage.removeItem(ACCESS_LINK_STORAGE_KEY);
}
