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
import { CancelReceivableDto } from './dto/cancel-receivable.dto';
import { PayReceivableDto } from './dto/pay-receivable.dto';
import { ReceivablesQueryDto } from './dto/receivables-query.dto';
import { ReceivablesService } from './receivables.service';

@Controller('receivables')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReceivablesController {
  constructor(private readonly receivablesService: ReceivablesService) {}

  @Get()
  @Permissions('credit.view')
  findAll(@CurrentUser() user: AuthUser, @Query() query: ReceivablesQueryDto) {
    return this.receivablesService.findAll(user.tenantId, query);
  }

  @Get('summary')
  @Permissions('credit.view')
  summary(@CurrentUser() user: AuthUser) {
    return this.receivablesService.getSummary(user.tenantId);
  }

  @Get('member/:memberId')
  @Permissions('credit.view')
  findByMember(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
  ) {
    return this.receivablesService.findByMember(user.tenantId, memberId);
  }

  @Get('member/:memberId/collectable')
  @Permissions('credit.collect')
  findCollectableByMember(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
  ) {
    return this.receivablesService.findCollectableByMember(
      user.tenantId,
      memberId,
    );
  }

  @Post()
  @Permissions('credit.create')
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: { memberId: string; amount: number; reason?: string; dueDate?: string },
  ) {
    return this.receivablesService.createManual(user.tenantId, user.userId, body);
  }

  @Post(':id/pay')
  @Permissions('credit.collect')
  pay(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() payReceivableDto: PayReceivableDto,
  ) {
    return this.receivablesService.pay(
      user.tenantId,
      user.userId,
      id,
      payReceivableDto,
    );
  }

  @Patch(':id/approve')
  @Permissions('credit.approve')
  approve(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.receivablesService.approve(user.tenantId, user.userId, id);
  }

  @Patch(':id/cancel')
  @Permissions('credit.cancel')
  cancel(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() cancelReceivableDto: CancelReceivableDto,
  ) {
    return this.receivablesService.cancel(
      user.tenantId,
      user.userId,
      id,
      cancelReceivableDto,
    );
  }
}
