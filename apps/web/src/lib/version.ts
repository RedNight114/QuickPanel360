// Central version info for the frontend.
// NEXT_PUBLIC_* vars are injected at build time by Next.js.
// Non-NEXT_PUBLIC_ vars are only available server-side; use NEXT_PUBLIC_* here.

export const APP_NAME = 'QuickPanel360';
export const APP_COMPANY = 'QuickAgence';

export const buildInfo = {
  app: APP_NAME,
  company: APP_COMPANY,
  version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
  environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  commitSha: process.env.NEXT_PUBLIC_GIT_SHA || 'local',
  buildDate: process.env.NEXT_PUBLIC_BUILD_DATE || 'local',
} as const;

export type BuildInfo = typeof buildInfo;

export function shortSha(sha: string): string {
  if (sha === 'local' || sha.length <= 8) return sha;
  return sha.slice(0, 8);
}
