import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { MemberClass } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { UpsertMemberClassDto } from './dto/upsert-member-class.dto';
import { MemberClassesService } from './member-classes.service';

@Controller('member-classes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MemberClassesController {
  constructor(private readonly memberClassesService: MemberClassesService) {}

  @Get()
  @Permissions('settings.read')
  findAll(@CurrentUser() user: AuthUser) {
    return this.memberClassesService.findAll(user.tenantId);
  }

  @Put(':memberClass')
  @Permissions('settings.update')
  upsert(
    @CurrentUser() user: AuthUser,
    @Param('memberClass') memberClass: MemberClass,
    @Body() dto: UpsertMemberClassDto,
  ) {
    return this.memberClassesService.upsert(user.tenantId, { ...dto, memberClass });
  }

  @Delete(':memberClass')
  @Permissions('settings.update')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('memberClass') memberClass: MemberClass,
  ) {
    return this.memberClassesService.remove(user.tenantId, memberClass);
  }
}
