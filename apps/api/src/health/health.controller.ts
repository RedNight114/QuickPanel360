import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { buildInfo } from '../version';
import { HealthService } from './health.service';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  checkApi() {
    return {
      status: 'ok',
      service: 'quickpanel360-api',
      version: buildInfo.version,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async checkReady() {
    const maintenance = process.env.MAINTENANCE_MODE === 'true';
    const [db, redis] = await Promise.all([
      this.healthService.checkDatabase().catch(() => null),
      this.healthService.checkRedis().catch(() => false),
    ]);

    if (!db) {
      throw new ServiceUnavailableException({
        status: 'unavailable',
        version: buildInfo.version,
        database: 'error',
        redis: redis ? 'connected' : 'unavailable',
        maintenance,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ready',
      version: buildInfo.version,
      database: 'connected',
      redis: redis ? 'connected' : 'unavailable',
      maintenance,
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/db')
  checkDatabase() {
    return this.healthService.checkDatabase();
  }

  @Get('version')
  getVersion() {
    return {
      ...buildInfo,
      // Shorten commitSha to 8 chars for readability; 'local' stays as-is
      commitSha:
        buildInfo.commitSha.length > 8
          ? buildInfo.commitSha.slice(0, 8)
          : buildInfo.commitSha,
    };
  }
}
