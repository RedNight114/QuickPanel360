import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ActivateEmergencyDto } from './dto/activate-emergency.dto';
import { SecurityService } from './security.service';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get('access-link/validate/:token')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async validateAccessLink(@Param('token') token: string) {
    const tenant = await this.securityService.validateAccessToken(token);

    return {
      valid: true,
      tenant: {
        id: tenant.tenantId,
        name: tenant.name,
        accessStatus: tenant.accessStatus,
      },
    };
  }

  @Get('access-link/current')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('access.regenerate')
  getCurrentAccessLink(@CurrentUser() user: AuthUser) {
    return this.securityService.getCurrentAccessLink(user.tenantId);
  }

  @Post('access-link/regenerate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('access.regenerate')
  regenerateAccessLink(@CurrentUser() user: AuthUser) {
    return this.securityService.regenerateAccessLink(
      user.tenantId,
      user.userId,
    );
  }

  @Post('emergency/activate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('emergency.activate')
  activateEmergency(
    @CurrentUser() user: AuthUser,
    @Body() activateEmergencyDto: ActivateEmergencyDto,
  ) {
    return this.securityService.activateEmergency(
      user.tenantId,
      user.userId,
      activateEmergencyDto,
    );
  }

  @Post('emergency/deactivate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('emergency.disable')
  deactivateEmergency(@CurrentUser() user: AuthUser) {
    return this.securityService.deactivateEmergency(user.tenantId, user.userId);
  }

  @Get('emergency/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('emergency.view')
  getEmergencyStatus(@CurrentUser() user: AuthUser) {
    return this.securityService.getEmergencyStatus(user.tenantId);
  }
}
