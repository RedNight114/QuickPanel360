import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateNotificationPreferenceDto } from './dto/update-notification-preferences.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.findOne(user.tenantId, user.tenantUserId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() updateMeDto: UpdateMeDto,
  ) {
    return this.usersService.update(
      user.tenantId,
      user.userId,
      user.tenantUserId,
      updateMeDto,
    );
  }

  @Get('me/notification-preferences')
  getNotificationPreferences(@CurrentUser() user: AuthUser) {
    return this.usersService.getNotificationPreferences(user.userId, user.tenantId);
  }

  @Patch('me/notification-preferences')
  updateNotificationPreference(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.usersService.updateNotificationPreference(
      user.userId,
      user.tenantId,
      dto.notificationType,
      dto.enabled,
    );
  }

  @Get()
  @Permissions('users.read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.usersService.findAll(user.tenantId);
  }

  @Get(':id')
  @Permissions('users.read')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.findOne(user.tenantId, id);
  }

  @Post('employees')
  @Permissions('users.create')
  createEmployee(
    @CurrentUser() user: AuthUser,
    @Body() createEmployeeDto: CreateEmployeeDto,
  ) {
    return this.usersService.createEmployee(
      user.tenantId,
      user.userId,
      createEmployeeDto,
    );
  }

  @Patch(':id')
  @Permissions('users.update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(
      user.tenantId,
      user.userId,
      id,
      updateUserDto,
    );
  }

  @Patch(':id/disable')
  @Permissions('users.disable')
  disable(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.usersService.disable(user.tenantId, user.userId, id);
  }

  @Patch(':id/role')
  @Permissions('users.permissions.update')
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(
      user.tenantId,
      user.userId,
      id,
      updateUserRoleDto,
    );
  }

  @Get(':id/permissions')
  @Permissions('users.permissions.update')
  getUserPermissions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.usersService.getUserPermissions(user.tenantId, id);
  }

  @Patch(':id/permissions')
  @Permissions('users.permissions.update')
  updateUserPermission(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { permissionKey: string; allowed: boolean | null },
  ) {
    return this.usersService.updateUserPermission(
      user.tenantId,
      user.userId,
      id,
      body.permissionKey,
      body.allowed,
    );
  }
}
