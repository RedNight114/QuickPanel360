import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateThirdPartyDto } from './dto/create-third-party.dto';
import { ThirdPartiesQueryDto } from './dto/third-parties-query.dto';
import { UpdateThirdPartyDto } from './dto/update-third-party.dto';
import { ThirdPartiesService } from './third-parties.service';

@Controller('third-parties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ThirdPartiesController {
  constructor(private readonly thirdPartiesService: ThirdPartiesService) {}

  @Get()
  @Permissions('third_party.view')
  findAll(@CurrentUser() user: AuthUser, @Query() query: ThirdPartiesQueryDto) {
    return this.thirdPartiesService.findAll(user.tenantId, query);
  }

  @Post()
  @Permissions('third_party.create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateThirdPartyDto) {
    return this.thirdPartiesService.create(user.tenantId, user.userId, dto);
  }

  @Patch(':id')
  @Permissions('third_party.update')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateThirdPartyDto,
  ) {
    return this.thirdPartiesService.update(user.tenantId, user.userId, id, dto);
  }

  @Patch(':id/archive')
  @Permissions('third_party.archive')
  archive(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.thirdPartiesService.archive(user.tenantId, user.userId, id);
  }
}
