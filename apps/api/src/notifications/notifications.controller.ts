import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Permissions('notifications.view')
  findAll(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    return this.notificationsService.findAll(user, query);
  }

  @Get('unread-count')
  @Permissions('notifications.view')
  getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user);
  }

  @Patch('read-all')
  @Permissions('notifications.view')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user);
  }

  @Patch(':id/read')
  @Permissions('notifications.view')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markRead(user, id);
  }

  @Patch(':id/in-review')
  @Permissions('notifications.resolve')
  markInReview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.markInReview(user, id);
  }

  @Patch(':id/resolve')
  @Permissions('notifications.resolve')
  resolve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.resolve(user, id);
  }

  @Patch(':id/archive')
  @Permissions('notifications.manage')
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notificationsService.archive(user, id);
  }
}
