import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CashMovementsQueryDto } from './dto/cash-movements-query.dto';
import { CashSessionsQueryDto } from './dto/cash-sessions-query.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { CashService } from './cash.service';

@Controller('cash')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('current-summary')
  @Permissions('cash.summary.view')
  currentSummary(@CurrentUser() user: AuthUser) {
    return this.cashService.getCurrentSummary(user.tenantId, user.userId);
  }

  @Get('movements')
  @Permissions('cash.movements.view')
  movements(
    @CurrentUser() user: AuthUser,
    @Query() query: CashMovementsQueryDto,
  ) {
    return this.cashService.findMovements(user.tenantId, query);
  }

  @Get('sessions')
  @Permissions('cash.sessions.view')
  sessions(
    @CurrentUser() user: AuthUser,
    @Query() query: CashSessionsQueryDto,
  ) {
    return this.cashService.findSessions(user.tenantId, query);
  }

  @Get('sessions/:id')
  @Permissions('cash.sessions.view')
  sessionDetail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.cashService.findSessionById(user.tenantId, id);
  }

  @Post('movements')
  @Permissions('cash.movements.create')
  createMovement(
    @CurrentUser() user: AuthUser,
    @Body() createCashMovementDto: CreateCashMovementDto,
  ) {
    return this.cashService.createMovement(
      user.tenantId,
      user.userId,
      user.permissions,
      createCashMovementDto,
    );
  }
}
