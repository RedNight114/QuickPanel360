import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CancelSaleDto } from './dto/cancel-sale.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';
import { PosService } from './pos.service';

@Controller('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('sessions/open')
  @Permissions('cash.open')
  openSession(
    @CurrentUser() user: AuthUser,
    @Body() openPosSessionDto: OpenPosSessionDto,
  ) {
    return this.posService.openSession(
      user.tenantId,
      user.userId,
      openPosSessionDto,
    );
  }

  @Get('sessions/current')
  @Permissions('cash.view_own')
  getCurrentSession(@CurrentUser() user: AuthUser) {
    return this.posService.getCurrentSession(user.tenantId, user.userId);
  }

  @Post('sessions/:id/close')
  @Permissions('cash.close')
  closeSession(
    @CurrentUser() user: AuthUser,
    @Param('id') sessionId: string,
    @Body() closePosSessionDto: ClosePosSessionDto,
  ) {
    return this.posService.closeSession(
      user.tenantId,
      user.userId,
      sessionId,
      closePosSessionDto,
    );
  }

  @Post('sales')
  @Permissions('pos.sell')
  createSale(
    @CurrentUser() user: AuthUser,
    @Body() createSaleDto: CreateSaleDto,
  ) {
    return this.posService.createSale(
      user.tenantId,
      user.userId,
      user.permissions,
      createSaleDto,
    );
  }

  @Get('sales')
  @Permissions('pos.history.read')
  findSales(@CurrentUser() user: AuthUser) {
    return this.posService.findSales(user.tenantId);
  }

  @Get('sales/:id')
  @Permissions('pos.history.read')
  findSaleById(@CurrentUser() user: AuthUser, @Param('id') saleId: string) {
    return this.posService.findSaleById(user.tenantId, saleId);
  }

  @Patch('sales/:id/cancel')
  @Permissions('pos.cancel')
  cancelSale(
    @CurrentUser() user: AuthUser,
    @Param('id') saleId: string,
    @Body() dto: CancelSaleDto,
  ) {
    return this.posService.cancelSale(
      user.tenantId,
      user.userId,
      saleId,
      dto.reason,
    );
  }

  @Get('members/:id/discounts')
  @Permissions('pos.sell')
  getMemberDiscounts(
    @CurrentUser() user: AuthUser,
    @Param('id') memberId: string,
  ) {
    return this.posService.getMemberSuggestedDiscounts(user.tenantId, memberId);
  }
}
