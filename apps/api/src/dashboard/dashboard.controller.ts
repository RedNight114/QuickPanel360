import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Permissions('dashboard.view')
  getSummary(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getSummary(user.tenantId);
  }

  @Get('sales')
  @Permissions('reports.view_limited')
  getSales(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getSales(user.tenantId);
  }

  @Get('inventory')
  @Permissions('stock.read')
  getInventory(@CurrentUser() user: AuthUser) {
    const canViewCost = user.permissions.includes('products.view_cost');

    return this.dashboardService.getInventory(user.tenantId, canViewCost);
  }

  @Get('members')
  @Permissions('members.read')
  getMembers(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getMembers(user.tenantId);
  }
}
