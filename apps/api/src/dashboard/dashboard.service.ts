import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  MemberStatus,
  PaymentStatus,
  PosSessionStatus,
  ProductStatus,
  SaleStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getSummary(tenantId: string) {
    const cacheKey = `dashboard:summary:${tenantId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    const { startOfDay, startOfMonth } = this.getDateRanges();

    const [
      totalMembers,
      activeMembers,
      suspendedMembers,
      bannedMembers,
      totalProducts,
      activeProducts,
      lowStockProducts,
      todaySales,
      monthSales,
      openCashSessions,
      lastSales,
      lastInventoryMovements,
    ] = await Promise.all([
      this.prisma.member.count({
        where: { tenantId, status: { not: MemberStatus.DELETED } },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.ACTIVE },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.SUSPENDED },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.BANNED },
      }),
      this.prisma.product.count({
        where: { tenantId, status: { not: ProductStatus.ARCHIVED } },
      }),
      this.prisma.product.count({
        where: { tenantId, status: ProductStatus.ACTIVE },
      }),
      this.countLowStockProducts(tenantId),
      this.sumSales(tenantId, startOfDay),
      this.sumSales(tenantId, startOfMonth),
      this.prisma.posSession.count({
        where: { tenantId, status: PosSessionStatus.OPEN },
      }),
      this.getRecentSales(tenantId, 10),
      this.getLastInventoryMovements(tenantId, 10),
    ]);

    const result = {
      totalMembers,
      activeMembers,
      suspendedMembers,
      bannedMembers,
      totalProducts,
      activeProducts,
      lowStockProducts,
      todaySalesTotal: todaySales.total,
      todaySalesCount: todaySales.count,
      monthSalesTotal: monthSales.total,
      monthSalesCount: monthSales.count,
      openCashSessions,
      lastSales: lastSales.map((sale) => ({
        ...sale,
        subtotal: this.toNumber(sale.subtotal),
        discount: this.toNumber(sale.discount),
        total: this.toNumber(sale.total),
        payments: sale.payments.map((p) => ({
          ...p,
          amount: this.toNumber(p.amount),
        })),
      })),
      lastInventoryMovements: lastInventoryMovements.map((m) => ({
        ...m,
        quantity: this.toNumber(m.quantity),
        previousQuantity: this.toNumber(m.previousQuantity),
        newQuantity: this.toNumber(m.newQuantity),
      })),
    };

    await this.cache.set(cacheKey, result, 30_000);
    return result;
  }

  async getSales(tenantId: string) {
    const salesCacheKey = `dashboard:sales:${tenantId}`;
    const salesCached = await this.cache.get(salesCacheKey);
    if (salesCached) return salesCached;

    const { startOfDay, startOfMonth } = this.getDateRanges();

    const [
      salesToday,
      salesThisMonth,
      salesByPaymentMethod,
      recentSales,
      topProducts,
    ] = await Promise.all([
      this.sumSales(tenantId, startOfDay),
      this.sumSales(tenantId, startOfMonth),
      this.getSalesByPaymentMethod(tenantId, startOfMonth),
      this.getRecentSales(tenantId, 20),
      this.getTopProducts(tenantId, startOfMonth),
    ]);

    const salesResult = { salesToday, salesThisMonth, salesByPaymentMethod, recentSales, topProducts };
    await this.cache.set(salesCacheKey, salesResult, 60_000);
    return salesResult;
  }

  async getInventory(tenantId: string, canViewCost: boolean) {
    const invCacheKey = `dashboard:inventory:${tenantId}:${canViewCost}`;
    const invCached = await this.cache.get(invCacheKey);
    if (invCached) return invCached;
    const [
      totalProducts,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
      inventoryValueEstimated,
      lastMovements,
    ] = await Promise.all([
      this.prisma.product.count({
        where: { tenantId, status: { not: ProductStatus.ARCHIVED } },
      }),
      this.prisma.product.count({
        where: { tenantId, status: ProductStatus.ACTIVE },
      }),
      this.countOutOfStockProducts(tenantId),
      this.countLowStockProducts(tenantId),
      canViewCost ? this.getInventoryValueEstimated(tenantId) : null,
      this.getLastInventoryMovements(tenantId, 10),
    ]);

    const invResult = { totalProducts, activeProducts, outOfStockProducts, lowStockProducts, inventoryValueEstimated, lastMovements };
    await this.cache.set(invCacheKey, invResult, 60_000);
    return invResult;
  }

  async getMembers(tenantId: string) {
    const memCacheKey = `dashboard:members:${tenantId}`;
    const memCached = await this.cache.get(memCacheKey);
    if (memCached) return memCached;
    const [
      totalMembers,
      activeMembers,
      pendingMembers,
      suspendedMembers,
      bannedMembers,
      inactiveMembers,
      recentMembers,
    ] = await Promise.all([
      this.prisma.member.count({
        where: { tenantId, status: { not: MemberStatus.DELETED } },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.ACTIVE },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.PENDING },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.SUSPENDED },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.BANNED },
      }),
      this.prisma.member.count({
        where: { tenantId, status: MemberStatus.INACTIVE },
      }),
      this.prisma.member.findMany({
        where: { tenantId, status: { not: MemberStatus.DELETED } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    const memResult = { totalMembers, activeMembers, pendingMembers, suspendedMembers, bannedMembers, inactiveMembers, recentMembers };
    await this.cache.set(memCacheKey, memResult, 60_000);
    return memResult;
  }

  private getDateRanges() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return { startOfDay, startOfMonth };
  }

  private async sumSales(tenantId: string, from: Date) {
    const [count, aggregate] = await Promise.all([
      this.prisma.sale.count({
        where: {
          tenantId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: from },
        },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: from },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      count,
      total: this.toNumber(aggregate._sum.total),
    };
  }

  private getRecentSales(tenantId: string, take: number) {
    return this.prisma.sale.findMany({
      where: {
        tenantId,
        status: SaleStatus.COMPLETED,
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        subtotal: true,
        discount: true,
        total: true,
        status: true,
        createdAt: true,
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payments: {
          select: {
            method: true,
            amount: true,
            status: true,
          },
        },
      },
    });
  }

  private getLastInventoryMovements(tenantId: string, take: number) {
    return this.prisma.inventoryMovement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        type: true,
        quantity: true,
        previousQuantity: true,
        newQuantity: true,
        reason: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  private async getSalesByPaymentMethod(tenantId: string, from: Date) {
    const groupedPayments = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        tenantId,
        status: PaymentStatus.COMPLETED,
        sale: {
          status: SaleStatus.COMPLETED,
          createdAt: { gte: from },
        },
      },
      _count: { _all: true },
      _sum: { amount: true },
    });

    return groupedPayments.map((payment) => ({
      method: payment.method,
      count: payment._count._all,
      total: this.toNumber(payment._sum.amount),
    }));
  }

  private async getTopProducts(tenantId: string, from: Date) {
    const groupedItems = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        tenantId,
        sale: {
          status: SaleStatus.COMPLETED,
          createdAt: { gte: from },
        },
      },
      _sum: {
        quantity: true,
        total: true,
      },
      orderBy: {
        _sum: {
          total: 'desc',
        },
      },
      take: 10,
    });

    const productIds = groupedItems.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
        unitType: true,
      },
    });
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );

    return groupedItems.map((item) => ({
      productId: item.productId,
      product: productById.get(item.productId) ?? null,
      quantity: this.toNumber(item._sum.quantity),
      total: this.toNumber(item._sum.total),
    }));
  }

  private async countLowStockProducts(tenantId: string) {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM inventory i
      JOIN products p ON p.id = i."productId"
      WHERE i."tenantId" = ${tenantId}
        AND p.status != 'ARCHIVED'
        AND i."currentQuantity" <= i."minimumQuantity"
        AND i."minimumQuantity" > 0
    `;
    return Number(result[0]?.count ?? 0);
  }

  private async countOutOfStockProducts(tenantId: string) {
    const result = await this.prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM inventory i
      JOIN products p ON p.id = i."productId"
      WHERE i."tenantId" = ${tenantId}
        AND p.status != 'ARCHIVED'
        AND i."currentQuantity" <= 0
    `;
    return Number(result[0]?.count ?? 0);
  }

  private async getInventoryValueEstimated(tenantId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        product: {
          status: { not: ProductStatus.ARCHIVED },
        },
      },
      select: {
        currentQuantity: true,
        product: {
          select: {
            cost: true,
          },
        },
      },
    });

    return inventories.reduce((sum, inventory) => {
      const cost = this.toNumber(inventory.product.cost);
      const quantity = this.toNumber(inventory.currentQuantity);

      return sum + cost * quantity;
    }, 0);
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }
}
