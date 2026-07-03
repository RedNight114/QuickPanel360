import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Permissions('reports.view_limited')
  getSummary(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getSummary(user.tenantId, { dateFrom, dateTo });
  }

  @Get('collaborators')
  getCollaborators(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    if (
      user.role !== UserRole.OWNER &&
      user.role !== UserRole.MANAGER &&
      !user.permissions.includes('analytics.collaborators.view')
    ) {
      throw new ForbiddenException(
        'No tienes permisos para ver el rendimiento operativo.',
      );
    }

    return this.analyticsService.getCollaborators(user.tenantId, {
      dateFrom,
      dateTo,
    });
  }

  @Get('products')
  @Permissions('reports.view_limited')
  getProductPerformance(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getProductPerformance(user.tenantId, { dateFrom, dateTo });
  }

  @Get('members')
  @Permissions('reports.view_limited')
  getMemberSpending(
    @CurrentUser() user: AuthUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.analyticsService.getMemberSpending(user.tenantId, { dateFrom, dateTo });
  }

  @Get('inventory')
  @Permissions('reports.view_limited')
  getInventoryTrends(@CurrentUser() user: AuthUser) {
    return this.analyticsService.getInventoryTrends(user.tenantId);
  }
}
