import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import {
  InventoryMovementType,
  MemberClass,
  MemberStatus,
  PosSessionStatus,
  Prisma,
  ProductStatus,
  ReceivableStatus,
  SaleStatus,
  ThirdPartyPaymentStatus,
  UserRole,
  TenantUserStatus,
  SaleItemPricingMode,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DateRangeInput = {
  dateFrom?: string;
  dateTo?: string;
};

type CollaboratorAccumulator = {
  userId: string;
  name: string;
  role: UserRole;
  totalDispensations: number;
  creditsRegistered: number;
  requestedGrams: number;
  actualDispensedGrams: number;
  positiveDifferenceGrams: number;
  negativeDifferenceGrams: number;
  toleranceExceededCount: number;
  bonusesApplied: number;
  pendingContributionsGenerated: number;
  cancellations: number;
  cashDifference: number;
  lastActivity: Date | null;
};

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getSummary(tenantId: string, range: DateRangeInput = {}) {
    const cacheKey = `analytics:summary:${tenantId}:${range.dateFrom ?? ''}:${range.dateTo ?? ''}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    const { from, to, birthdayMonth } = this.resolveRange(range);
    const saleWhere = {
      tenantId,
      status: SaleStatus.COMPLETED,
      createdAt: {
        gte: from,
        lte: to,
      },
    } satisfies Prisma.SaleWhereInput;

    const memberBaseWhere = {
      tenantId,
      status: { not: MemberStatus.DELETED },
    } satisfies Prisma.MemberWhereInput;

    const [
      saleAggregate,
      activeMembers,
      newMembers,
      pendingReceivablesAggregate,
      lowInventoryCount,
      outOfAvailabilityCount,
      latestCashSession,
      thirdPartyAggregate,
      topProductsRaw,
      sales,
      membersByClassRaw,
      birthdayMembersThisMonth,
      scaleWasteAggregate,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.member.count({
        where: {
          ...memberBaseWhere,
          status: MemberStatus.ACTIVE,
        },
      }),
      this.prisma.member.count({
        where: {
          ...memberBaseWhere,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      }),
      this.prisma.receivable.aggregate({
        where: {
          tenantId,
          status: {
            in: [ReceivableStatus.OPEN, ReceivableStatus.PARTIALLY_PAID, ReceivableStatus.OVERDUE],
          },
        },
        _sum: {
          outstandingAmount: true,
        },
      }),
      this.countLowInventory(tenantId),
      this.countOutOfAvailability(tenantId),
      this.prisma.posSession.findFirst({
        where: { tenantId },
        orderBy: [
          { status: 'asc' },
          { openedAt: 'desc' },
        ],
        select: {
          status: true,
          expectedCash: true,
          difference: true,
        },
      }),
      this.prisma.thirdPartyPayment.aggregate({
        where: {
          tenantId,
          status: ThirdPartyPaymentStatus.PAID,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: {
          tenantId,
          sale: saleWhere,
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
        take: 8,
      }),
      this.prisma.sale.findMany({
        where: saleWhere,
        select: {
          createdAt: true,
          total: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.member.groupBy({
        by: ['memberClass'],
        where: memberBaseWhere,
        _count: { _all: true },
      }),
      this.prisma.member.findMany({
        where: {
          ...memberBaseWhere,
          birthDate: {
            not: null,
          },
        },
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          memberClass: true,
        },
      }),
      this.prisma.saleItem.aggregate({
        where: {
          tenantId,
          sale: saleWhere,
        },
        _sum: {
          weightDifference: true,
          wasteQuantity: true,
        },
      }),
    ]);

    const productIds = topProductsRaw.map((item) => item.productId);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: {
            tenantId,
            id: { in: productIds },
          },
          select: {
            id: true,
            name: true,
            unitType: true,
            status: true,
          },
        })
      : [];

    const productMap = new Map(products.map((product) => [product.id, product]));
    const activityByDay = this.buildActivityByDay(sales, from, to);
    const membersByClass = this.buildMembersByClass(membersByClassRaw);
    const birthdayMembers = birthdayMembersThisMonth
      .filter((member) => member.birthDate && new Date(member.birthDate).getMonth() === birthdayMonth)
      .slice(0, 12)
      .map((member) => ({
        id: member.id,
        memberNumber: member.memberNumber,
        name: `${member.firstName ?? ''} ${member.lastName ?? ''}`.trim() || member.memberNumber,
        birthDate: member.birthDate,
        memberClass: member.memberClass,
      }));

    const totalDispensations = saleAggregate._count._all;
    const totalCredits = this.toNumber(saleAggregate._sum.total);
    const averageDispensation = totalDispensations > 0 ? totalCredits / totalDispensations : 0;
    const weightDifference = this.toNumber(scaleWasteAggregate._sum.weightDifference);
    const wasteQuantity = this.toNumber(scaleWasteAggregate._sum.wasteQuantity);

    const result = {
      range: {
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
      },
      totalDispensations,
      totalCredits,
      averageDispensation,
      activeMembers,
      newMembers,
      pendingContributions: this.toNumber(pendingReceivablesAggregate._sum.outstandingAmount),
      lowInventoryCount,
      outOfAvailabilityCount,
      scaleWastePositive: weightDifference > 0 ? weightDifference : wasteQuantity > 0 ? wasteQuantity : 0,
      scaleWasteNegative: weightDifference < 0 ? Math.abs(weightDifference) : 0,
      cashExpected: this.toNumber(latestCashSession?.expectedCash),
      cashDifference: this.toNumber(latestCashSession?.difference),
      thirdPartyContributions: this.toNumber(thirdPartyAggregate._sum.amount),
      topProducts: topProductsRaw.map((item) => ({
        productId: item.productId,
        name: productMap.get(item.productId)?.name ?? 'Producto',
        unitType: productMap.get(item.productId)?.unitType ?? null,
        quantity: this.toNumber(item._sum.quantity),
        totalCredits: this.toNumber(item._sum.total),
      })),
      activityByDay,
      membersByClass,
      birthdayMembersThisMonth: birthdayMembers,
    };

    await this.cache.set(cacheKey, result, 60_000);
    return result;
  }

  async getCollaborators(tenantId: string, range: DateRangeInput = {}) {
    const { from, to } = this.resolveRange(range);
    const tenantUsers = await this.prisma.tenantUser.findMany({
      where: {
        tenantId,
        status: TenantUserStatus.ACTIVE,
        role: {
          in: [UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE],
        },
      },
      select: {
        role: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
    });

    const collaboratorIds = tenantUsers.map((item) => item.userId);
    const collaborators = new Map<string, CollaboratorAccumulator>(
      tenantUsers.map((item) => [
        item.userId,
        {
          userId: item.userId,
          name: item.user.name || item.user.email,
          role: item.role,
          totalDispensations: 0,
          creditsRegistered: 0,
          requestedGrams: 0,
          actualDispensedGrams: 0,
          positiveDifferenceGrams: 0,
          negativeDifferenceGrams: 0,
          toleranceExceededCount: 0,
          bonusesApplied: 0,
          pendingContributionsGenerated: 0,
          cancellations: 0,
          cashDifference: 0,
          lastActivity: null,
        },
      ]),
    );

    if (!collaboratorIds.length) {
      return {
        range: {
          dateFrom: from.toISOString(),
          dateTo: to.toISOString(),
        },
        collaborators: [],
      };
    }

    const [completedSales, cancelledSales, receivables, sessions] =
      await Promise.all([
        this.prisma.sale.findMany({
          where: {
            tenantId,
            soldById: { in: collaboratorIds },
            status: SaleStatus.COMPLETED,
            createdAt: {
              gte: from,
              lte: to,
            },
          },
          select: {
            soldById: true,
            total: true,
            discount: true,
            createdAt: true,
            items: {
              select: {
                quantity: true,
                pricingMode: true,
                actualWeight: true,
                weightDifference: true,
                wasteQuantity: true,
                scaleToleranceExceeded: true,
              },
            },
          },
        }),
        this.prisma.sale.findMany({
          where: {
            tenantId,
            status: SaleStatus.CANCELLED,
            cancelledById: { in: collaboratorIds },
            cancelledAt: {
              gte: from,
              lte: to,
            },
          },
          select: {
            cancelledById: true,
            cancelledAt: true,
          },
        }),
        this.prisma.receivable.findMany({
          where: {
            tenantId,
            createdById: { in: collaboratorIds },
            createdAt: {
              gte: from,
              lte: to,
            },
          },
          select: {
            createdById: true,
            originalAmount: true,
            createdAt: true,
          },
        }),
        this.prisma.posSession.findMany({
          where: {
            tenantId,
            openedById: { in: collaboratorIds },
            status: PosSessionStatus.CLOSED,
            closedAt: {
              gte: from,
              lte: to,
            },
          },
          select: {
            openedById: true,
            difference: true,
            openedAt: true,
            closedAt: true,
          },
        }),
      ]);

    completedSales.forEach((sale) => {
      const collaborator = collaborators.get(sale.soldById);
      if (!collaborator) {
        return;
      }

      collaborator.totalDispensations += 1;
      collaborator.creditsRegistered += this.toNumber(sale.total);
      collaborator.bonusesApplied += this.toNumber(sale.discount);
      this.setLatestActivity(collaborator, sale.createdAt);

      sale.items.forEach((item) => {
        const isWeightedItem =
          item.pricingMode === SaleItemPricingMode.BY_WEIGHT ||
          item.actualWeight !== null ||
          item.weightDifference !== null ||
          item.wasteQuantity !== null;

        if (!isWeightedItem) {
          return;
        }

        collaborator.requestedGrams += this.kgToGrams(item.quantity);
        collaborator.actualDispensedGrams += this.kgToGrams(item.actualWeight);

        const difference = this.toNumber(item.weightDifference);
        if (difference > 0) {
          collaborator.positiveDifferenceGrams += this.kgToGrams(difference);
        } else if (difference < 0) {
          collaborator.negativeDifferenceGrams += this.kgToGrams(
            Math.abs(difference),
          );
        } else if (item.wasteQuantity !== null) {
          collaborator.positiveDifferenceGrams += this.kgToGrams(
            item.wasteQuantity,
          );
        }

        if (item.scaleToleranceExceeded) {
          collaborator.toleranceExceededCount += 1;
        }
      });
    });

    cancelledSales.forEach((sale) => {
      if (!sale.cancelledById) {
        return;
      }

      const collaborator = collaborators.get(sale.cancelledById);
      if (!collaborator) {
        return;
      }

      collaborator.cancellations += 1;
      this.setLatestActivity(collaborator, sale.cancelledAt);
    });

    receivables.forEach((receivable) => {
      const collaborator = collaborators.get(receivable.createdById);
      if (!collaborator) {
        return;
      }

      collaborator.pendingContributionsGenerated += this.toNumber(
        receivable.originalAmount,
      );
      this.setLatestActivity(collaborator, receivable.createdAt);
    });

    sessions.forEach((session) => {
      const collaborator = collaborators.get(session.openedById);
      if (!collaborator) {
        return;
      }

      collaborator.cashDifference += this.toNumber(session.difference);
      this.setLatestActivity(collaborator, session.closedAt ?? session.openedAt);
    });

    return {
      range: {
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
      },
      collaborators: Array.from(collaborators.values())
        .map((item) => ({
          userId: item.userId,
          name: item.name,
          role: item.role,
          totalDispensations: item.totalDispensations,
          creditsRegistered: this.roundNumber(item.creditsRegistered),
          averageDispensation:
            item.totalDispensations > 0
              ? this.roundNumber(
                  item.creditsRegistered / item.totalDispensations,
                )
              : 0,
          requestedGrams: this.roundNumber(item.requestedGrams, 2),
          actualDispensedGrams: this.roundNumber(
            item.actualDispensedGrams,
            2,
          ),
          positiveDifferenceGrams: this.roundNumber(
            item.positiveDifferenceGrams,
            2,
          ),
          negativeDifferenceGrams: this.roundNumber(
            item.negativeDifferenceGrams,
            2,
          ),
          toleranceExceededCount: item.toleranceExceededCount,
          bonusesApplied: this.roundNumber(item.bonusesApplied),
          pendingContributionsGenerated: this.roundNumber(
            item.pendingContributionsGenerated,
          ),
          cancellations: item.cancellations,
          cashDifference: this.roundNumber(item.cashDifference),
          lastActivity: item.lastActivity?.toISOString() ?? null,
        }))
        .sort((left, right) => {
          if (right.creditsRegistered !== left.creditsRegistered) {
            return right.creditsRegistered - left.creditsRegistered;
          }

          return right.totalDispensations - left.totalDispensations;
        }),
    };
  }

  private buildActivityByDay(
    sales: Array<{ createdAt: Date; total: Prisma.Decimal }>,
    from: Date,
    to: Date,
  ) {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
    });
    const buckets = new Map<string, { date: string; label: string; dispensations: number; credits: number }>();
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);

    while (cursor <= to) {
      const key = cursor.toISOString().slice(0, 10);
      buckets.set(key, {
        date: key,
        label: formatter.format(cursor),
        dispensations: 0,
        credits: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    sales.forEach((sale) => {
      const key = sale.createdAt.toISOString().slice(0, 10);
      const bucket = buckets.get(key);
      if (!bucket) return;
      bucket.dispensations += 1;
      bucket.credits += this.toNumber(sale.total);
    });

    return Array.from(buckets.values());
  }

  private buildMembersByClass(
    rows: Array<{ memberClass: MemberClass; _count: { _all: number } }>,
  ) {
    const labels: Record<MemberClass, string> = {
      STANDARD: 'Estándar',
      PREFERRED: 'Preferente',
      VIP: 'VIP',
    };

    return (Object.keys(labels) as MemberClass[]).map((memberClass) => ({
      memberClass,
      label: labels[memberClass],
      count: rows.find((row) => row.memberClass === memberClass)?._count._all ?? 0,
    }));
  }

  private async countLowInventory(tenantId: string) {
    const inventories = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        product: {
          status: { not: ProductStatus.ARCHIVED },
        },
      },
      select: {
        currentQuantity: true,
        minimumQuantity: true,
      },
    });

    return inventories.filter((item) => {
      const current = this.toNumber(item.currentQuantity);
      const minimum = this.toNumber(item.minimumQuantity);
      return current > 0 && current <= minimum;
    }).length;
  }

  private async countOutOfAvailability(tenantId: string) {
    return this.prisma.inventory.count({
      where: {
        tenantId,
        currentQuantity: { lte: 0 },
        product: {
          status: { not: ProductStatus.ARCHIVED },
        },
      },
    });
  }

  private resolveRange(range: DateRangeInput) {
    const now = new Date();
    const from = range.dateFrom ? new Date(range.dateFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = range.dateTo ? new Date(range.dateTo) : now;

    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    return {
      from,
      to,
      birthdayMonth: now.getMonth(),
    };
  }

  private toNumber(value: Prisma.Decimal | number | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }

    return Number(value);
  }

  private kgToGrams(value: Prisma.Decimal | number | null | undefined) {
    return this.toNumber(value) * 1000;
  }

  private roundNumber(value: number, maximumFractionDigits = 2) {
    return Number(value.toFixed(maximumFractionDigits));
  }

  async getProductPerformance(tenantId: string, range: { dateFrom?: string; dateTo?: string }) {
    const where: any = { tenantId };
    if (range.dateFrom || range.dateTo) {
      where.createdAt = {};
      if (range.dateFrom) where.createdAt.gte = new Date(range.dateFrom);
      if (range.dateTo) where.createdAt.lte = new Date(range.dateTo);
    }

    const saleItems = await this.prisma.saleItem.findMany({
      where: { sale: where },
      include: { product: { select: { id: true, name: true, categoryId: true } } },
    });

    const productMap = new Map<string, { id: string; name: string; categoryId: string | null; quantity: number; revenue: number; count: number }>();
    for (const item of saleItems) {
      const key = item.productId;
      const existing = productMap.get(key) ?? { id: item.productId, name: item.product.name, categoryId: item.product.categoryId, quantity: 0, revenue: 0, count: 0 };
      existing.quantity += Number(item.quantity);
      existing.revenue += Number(item.total);
      existing.count += 1;
      productMap.set(key, existing);
    }

    return Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 50);
  }

  async getMemberSpending(tenantId: string, range: { dateFrom?: string; dateTo?: string }) {
    const where: any = { tenantId, status: 'COMPLETED' };
    if (range.dateFrom || range.dateTo) {
      where.createdAt = {};
      if (range.dateFrom) where.createdAt.gte = new Date(range.dateFrom);
      if (range.dateTo) where.createdAt.lte = new Date(range.dateTo);
    }

    const sales = await this.prisma.sale.findMany({
      where,
      select: { memberId: true, total: true, member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } } },
    });

    const memberMap = new Map<string, { id: string; name: string; memberNumber: string | null; totalSpent: number; salesCount: number }>();
    for (const sale of sales) {
      if (!sale.memberId) continue;
      const existing = memberMap.get(sale.memberId) ?? {
        id: sale.memberId,
        name: [sale.member?.firstName, sale.member?.lastName].filter(Boolean).join(' '),
        memberNumber: sale.member?.memberNumber ?? null,
        totalSpent: 0,
        salesCount: 0,
      };
      existing.totalSpent += Number(sale.total);
      existing.salesCount += 1;
      memberMap.set(sale.memberId, existing);
    }

    return Array.from(memberMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 50);
  }

  async getInventoryTrends(tenantId: string) {
    const inventoryItems = await this.prisma.inventory.findMany({
      where: { tenantId },
      select: {
        productId: true,
        currentQuantity: true,
        minimumQuantity: true,
        product: { select: { id: true, name: true, categoryId: true, status: true, category: { select: { name: true } } } },
      },
    });

    const activeItems = inventoryItems.filter(i => i.product.status === 'ACTIVE');

    const wasteMovements = await this.prisma.inventoryMovement.findMany({
      where: { tenantId, type: 'WASTE', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { productId: true, quantity: true },
    });

    const wasteByProduct = new Map<string, number>();
    for (const m of wasteMovements) {
      wasteByProduct.set(m.productId, (wasteByProduct.get(m.productId) ?? 0) + Math.abs(Number(m.quantity)));
    }

    const products = activeItems
      .map(i => ({
        id: i.product.id,
        name: i.product.name,
        categoryId: i.product.categoryId,
        category: i.product.category,
        currentStock: Number(i.currentQuantity),
        minimumStock: Number(i.minimumQuantity),
        waste30d: wasteByProduct.get(i.productId) ?? 0,
        stockStatus: (Number(i.currentQuantity) <= 0 ? 'OUT_OF_STOCK' : Number(i.currentQuantity) <= Number(i.minimumQuantity) ? 'LOW' : 'OK') as string,
      }))
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 50);

    return {
      products,
      summary: {
        totalProducts: activeItems.length,
        outOfStock: activeItems.filter(i => Number(i.currentQuantity) <= 0).length,
        lowStock: activeItems.filter(i => Number(i.currentQuantity) > 0 && Number(i.currentQuantity) <= Number(i.minimumQuantity)).length,
        totalWaste30d: Array.from(wasteByProduct.values()).reduce((a, b) => a + b, 0),
      },
    };
  }

  private setLatestActivity(
    collaborator: CollaboratorAccumulator,
    value: Date | null | undefined,
  ) {
    if (!value) {
      return;
    }

    if (!collaborator.lastActivity || value > collaborator.lastActivity) {
      collaborator.lastActivity = value;
    }
  }
}
