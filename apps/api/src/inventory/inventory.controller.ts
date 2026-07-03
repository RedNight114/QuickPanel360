import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AddStockDto } from './dto/add-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { WasteStockDto } from './dto/waste-stock.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Permissions('stock.read_basic')
  findAll(@CurrentUser() user: AuthUser, @Query('take') take?: string) {
    const limit = Math.min(Math.max(Number(take) || 500, 1), 1000);
    return this.inventoryService.findAll(
      user.tenantId,
      user.permissions.includes('products.view_cost'),
      limit,
    );
  }

  @Get('movements')
  @Permissions('stock.movements.read')
  findMovements(@CurrentUser() user: AuthUser) {
    return this.inventoryService.findMovements(user.tenantId);
  }

  @Post(':productId/add')
  @Permissions('stock.add')
  addStock(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() addStockDto: AddStockDto,
  ) {
    return this.inventoryService.addStock(
      user.tenantId,
      user.userId,
      productId,
      addStockDto,
    );
  }

  @Post(':productId/adjust')
  @Permissions('stock.adjust')
  adjustStock(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() adjustStockDto: AdjustStockDto,
  ) {
    return this.inventoryService.adjustStock(
      user.tenantId,
      user.userId,
      productId,
      adjustStockDto,
    );
  }

  @Post(':productId/waste')
  @Permissions('stock.adjust')
  wasteStock(
    @CurrentUser() user: AuthUser,
    @Param('productId') productId: string,
    @Body() wasteStockDto: WasteStockDto,
  ) {
    return this.inventoryService.wasteStock(
      user.tenantId,
      user.userId,
      productId,
      wasteStockDto,
    );
  }
}
