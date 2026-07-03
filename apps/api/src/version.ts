// Central version module — injected at build time via environment variables.
// Fallbacks are safe for local development; production values come from CI.
import { readFileSync } from 'fs';
import { join } from 'path';

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
    ) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export const APP_NAME = 'QuickPanel360';
export const APP_COMPANY = 'QuickAgence';

export const buildInfo = {
  app: APP_NAME,
  company: APP_COMPANY,
  version: process.env.APP_VERSION || readPackageVersion(),
  environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  commitSha: process.env.GIT_SHA || process.env.GIT_COMMIT_SHA || 'local',
  buildDate: process.env.BUILD_DATE || 'local',
  releaseChannel: process.env.RELEASE_CHANNEL || 'stable',
} as const;

export type BuildInfo = typeof buildInfo;
