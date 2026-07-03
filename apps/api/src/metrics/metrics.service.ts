import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';

type RequestMetric = {
  method: string;
  path: string;
  status: number;
  duration: number;
  timestamp: number;
};

@Injectable()
export class MetricsService {
  private readonly buffer: RequestMetric[] = [];
  private static readonly MAX_BUFFER = 5000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  record(metric: RequestMetric) {
    this.buffer.push(metric);
    if (this.buffer.length > MetricsService.MAX_BUFFER) {
      this.buffer.splice(0, this.buffer.length - MetricsService.MAX_BUFFER);
    }
  }

  async getSummary(minutes = 5) {
    const cutoff = Date.now() - minutes * 60 * 1000;
    const recent = this.buffer.filter((m) => m.timestamp >= cutoff);

    const totalRequests = recent.length;
    const errors = recent.filter((m) => m.status >= 500).length;
    const clientErrors = recent.filter((m) => m.status >= 400 && m.status < 500).length;
    const durations = recent.map((m) => m.duration).sort((a, b) => a - b);

    const p50 = this.percentile(durations, 50);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);
    const avg = durations.length
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : 0;

    const byRoute = new Map<string, { count: number; errors: number; totalDuration: number; maxDuration: number }>();
    for (const m of recent) {
      const key = `${m.method} ${this.normalizePath(m.path)}`;
      const entry = byRoute.get(key) ?? { count: 0, errors: 0, totalDuration: 0, maxDuration: 0 };
      entry.count++;
      if (m.status >= 500) entry.errors++;
      entry.totalDuration += m.duration;
      entry.maxDuration = Math.max(entry.maxDuration, m.duration);
      byRoute.set(key, entry);
    }

    const topRoutes = [...byRoute.entries()]
      .map(([route, data]) => ({
        route,
        count: data.count,
        errors: data.errors,
        avgMs: Math.round(data.totalDuration / data.count),
        maxMs: data.maxDuration,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const slowRoutes = [...byRoute.entries()]
      .map(([route, data]) => ({
        route,
        count: data.count,
        avgMs: Math.round(data.totalDuration / data.count),
        maxMs: data.maxDuration,
      }))
      .sort((a, b) => b.avgMs - a.avgMs)
      .slice(0, 10);

    const recentErrors = recent
      .filter((m) => m.status >= 500)
      .slice(-20)
      .reverse()
      .map((m) => ({
        method: m.method,
        path: m.path,
        status: m.status,
        duration: m.duration,
        timestamp: new Date(m.timestamp).toISOString(),
      }));

    let redisStatus = 'unavailable';
    try {
      const pong = await this.redis.ping();
      redisStatus = pong === 'PONG' ? 'connected' : 'error';
    } catch {
      redisStatus = 'error';
    }

    let dbStatus = 'unavailable';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }

    const mem = process.memoryUsage();

    return {
      period: `${minutes}m`,
      uptime: Math.round(process.uptime()),
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        rssMb: Math.round(mem.rss / 1024 / 1024),
      },
      infrastructure: {
        database: dbStatus,
        redis: redisStatus,
      },
      requests: {
        total: totalRequests,
        errors,
        clientErrors,
        errorRate: totalRequests ? Math.round((errors / totalRequests) * 10000) / 100 : 0,
        reqPerSec: minutes > 0 ? Math.round((totalRequests / (minutes * 60)) * 100) / 100 : 0,
      },
      latency: {
        avgMs: avg,
        p50Ms: p50,
        p95Ms: p95,
        p99Ms: p99,
        maxMs: durations.length ? durations[durations.length - 1] : 0,
      },
      topRoutes,
      slowRoutes,
      recentErrors,
    };
  }

  private percentile(sorted: number[], p: number) {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private normalizePath(path: string) {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\?.*$/, '');
  }
}
