import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Permissions('settings.read')
  findSettings(@CurrentUser() user: AuthUser) {
    return this.settingsService.findSettings(user.tenantId);
  }

  @Patch()
  @Permissions('settings.update')
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() updateTenantSettingsDto: UpdateTenantSettingsDto,
  ) {
    return this.settingsService.updateSettings(
      user.tenantId,
      user.userId,
      updateTenantSettingsDto,
    );
  }
}
