import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { MetricsService } from './metrics.service';

@SkipThrottle()
@Controller('platform/metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('live')
  getLiveMetrics(
    @CurrentUser() user: AuthUser,
    @Query('minutes') minutes?: string,
  ) {
    if (user.role !== 'SUPERADMIN') {
      return { error: 'Forbidden' };
    }

    return this.metricsService.getSummary(
      Math.min(Math.max(Number(minutes) || 5, 1), 60),
    );
  }
}
