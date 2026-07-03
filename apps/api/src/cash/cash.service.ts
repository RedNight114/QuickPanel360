import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementType, PosSessionStatus, SaleStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CashMovementsQueryDto } from './dto/cash-movements-query.dto';
import { CashSessionsQueryDto } from './dto/cash-sessions-query.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';

const POSITIVE_TYPES = new Set<CashMovementType>([
  CashMovementType.SALE_CASH_IN,
  CashMovementType.RECEIVABLE_CASH_IN,
  CashMovementType.CASH_IN,
  CashMovementType.CORRECTION_IN,
]);

const NEGATIVE_TYPES = new Set<CashMovementType>([
  CashMovementType.THIRD_PARTY_CASH_OUT,
  CashMovementType.WITHDRAWAL,
  CashMovementType.CASH_OUT,
  CashMovementType.EXPENSE,
  CashMovementType.CORRECTION_OUT,
]);

const MANUAL_TYPES = new Set<CashMovementType>([
  CashMovementType.CASH_IN,
  CashMovementType.WITHDRAWAL,
  CashMovementType.EXPENSE,
  CashMovementType.CORRECTION_IN,
  CashMovementType.CORRECTION_OUT,
]);

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getCurrentSummary(tenantId: string, userId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: {
        tenantId,
        openedById: userId,
        status: PosSessionStatus.OPEN,
      },
      orderBy: {
        openedAt: 'desc',
      },
      include: {
        openedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cashMovements: {
          orderBy: {
            createdAt: 'desc',
          },
          include: this.movementInclude(),
        },
        sales: {
          where: {
            status: {
              not: SaleStatus.CANCELLED,
            },
          },
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        receivablePayments: true,
      },
    });

    if (!session) {
      return {
        session: null,
        summary: this.emptySummary(),
        recentMovements: [],
      };
    }

    return {
      session: {
        id: session.id,
        openedAt: session.openedAt,
        openingCash: session.openingCash,
        status: session.status,
        openedBy: session.openedBy,
      },
      summary: this.buildSummary(session),
      recentMovements: session.cashMovements.slice(0, 10),
    };
  }

  async findMovements(tenantId: string, query: CashMovementsQueryDto) {
    const movements = await this.prisma.cashMovement.findMany({
      where: {
        tenantId,
        posSessionId: query.sessionId,
        type: query.type,
        createdAt: this.dateRange(query.dateFrom, query.dateTo),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: query.take ?? 150,
      include: this.movementInclude(),
    });

    return movements.map((m) => ({ ...m, amount: Number(m.amount) }));
  }

  async findSessions(tenantId: string, query: CashSessionsQueryDto) {
    const sessions = await this.prisma.posSession.findMany({
      where: {
        tenantId,
        status: query.status,
        openedById: query.userId,
        openedAt: this.dateRange(query.dateFrom, query.dateTo),
      },
      orderBy: {
        openedAt: 'desc',
      },
      take: query.take ?? 100,
      include: {
        openedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cashMovements: true,
        sales: {
          where: {
            status: {
              not: SaleStatus.CANCELLED,
            },
          },
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
        receivablePayments: true,
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      status: session.status,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingCash: Number(session.openingCash),
      closingCash: session.closingCash !== null ? Number(session.closingCash) : null,
      expectedCash: Number(session.expectedCash ?? this.buildSummary(session).expectedCash),
      difference: session.difference !== null ? Number(session.difference) : null,
      openedBy: session.openedBy,
      closedBy: session.closedBy,
      summary: this.buildSummary(session),
    }));
  }

  async findSessionById(tenantId: string, sessionId: string) {
    const session = await this.prisma.posSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
      include: {
        openedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        closedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sales: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            member: {
              select: {
                id: true,
                memberNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            payments: true,
          },
        },
        cashMovements: {
          orderBy: {
            createdAt: 'desc',
          },
          include: this.movementInclude(),
        },
        receivablePayments: {
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            member: {
              select: {
                id: true,
                memberNumber: true,
                firstName: true,
                lastName: true,
              },
            },
            receivedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesión de caja no encontrada');
    }

    return {
      session: {
        ...session,
        openingCash: Number(session.openingCash),
        closingCash: session.closingCash !== null ? Number(session.closingCash) : null,
        expectedCash: session.expectedCash !== null ? Number(session.expectedCash) : null,
        difference: session.difference !== null ? Number(session.difference) : null,
      },
      summary: this.buildSummary(session),
    };
  }

  async createMovement(
    tenantId: string,
    userId: string,
    permissions: string[],
    dto: CreateCashMovementDto,
  ) {
    if (!MANUAL_TYPES.has(dto.type)) {
      throw new BadRequestException(
        'Este tipo de movimiento no puede crearse manualmente.',
      );
    }

    this.assertMovementPermission(dto.type, permissions);

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.posSession.findFirst({
        where: {
          tenantId,
          openedById: userId,
          status: PosSessionStatus.OPEN,
        },
        orderBy: {
          openedAt: 'desc',
        },
      });

      if (!session) {
        throw new BadRequestException(
          'Debes tener una caja abierta para registrar movimientos.',
        );
      }

      const reason = dto.notes?.trim()
        ? `${dto.reason.trim()} · ${dto.notes.trim()}`
        : dto.reason.trim();

      const movement = await tx.cashMovement.create({
        data: {
          tenantId,
          posSessionId: session.id,
          type: dto.type,
          amount: dto.amount,
          reason,
          createdById: userId,
        },
        include: this.movementInclude(),
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'cash.manual_movement_created',
        entityType: 'cash_movement',
        entityId: movement.id,
        newValue: {
          type: movement.type,
          amount: Number(movement.amount),
          reason: movement.reason,
          posSessionId: session.id,
        },
      });

      const refreshedSession = await tx.posSession.findUnique({
        where: {
          id: session.id,
        },
        include: {
          cashMovements: true,
          sales: {
            where: {
              status: {
                not: SaleStatus.CANCELLED,
              },
            },
            select: {
              id: true,
              total: true,
              status: true,
            },
          },
          receivablePayments: true,
        },
      });

      return {
        movement,
        summary: refreshedSession ? this.buildSummary(refreshedSession) : null,
      };
    });
  }

  private assertMovementPermission(
    type: CashMovementType,
    permissions: string[],
  ) {
    if (
      type === CashMovementType.WITHDRAWAL &&
      !permissions.includes('cash.withdraw')
    ) {
      throw new ForbiddenException(
        'No tienes permiso para registrar retiradas.',
      );
    }

    if (
      type === CashMovementType.EXPENSE &&
      !permissions.includes('cash.expense')
    ) {
      throw new ForbiddenException('No tienes permiso para registrar gastos.');
    }

    if (
      (type === CashMovementType.CORRECTION_IN ||
        type === CashMovementType.CORRECTION_OUT) &&
      !permissions.includes('cash.correction')
    ) {
      throw new ForbiddenException(
        'No tienes permiso para registrar correcciones.',
      );
    }
  }

  private movementInclude() {
    return {
      posSession: {
        select: {
          id: true,
          openedAt: true,
          status: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      sale: {
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
      },
      thirdPartyPayment: {
        select: {
          id: true,
          amount: true,
          category: true,
          reason: true,
          status: true,
          thirdParty: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
    };
  }

  private buildSummary(session: {
    openingCash: unknown;
    cashMovements?: { type: CashMovementType; amount: unknown }[];
    sales?: { total: unknown; status?: SaleStatus }[];
    receivablePayments?: { amount: unknown }[];
  }) {
    const movements = session.cashMovements ?? [];
    const saleCashIn = this.sumByTypes(movements, [
      CashMovementType.SALE_CASH_IN,
    ]);
    const receivableCashIn = this.sumByTypes(movements, [
      CashMovementType.RECEIVABLE_CASH_IN,
    ]);
    const manualCashIn = this.sumByTypes(movements, [CashMovementType.CASH_IN]);
    const correctionsIn = this.sumByTypes(movements, [
      CashMovementType.CORRECTION_IN,
    ]);
    const thirdPartyCashOut = this.sumByTypes(movements, [
      CashMovementType.THIRD_PARTY_CASH_OUT,
    ]);
    const cashOut = this.sumByTypes(movements, [CashMovementType.CASH_OUT]);
    const expenses = this.sumByTypes(movements, [CashMovementType.EXPENSE]);
    const withdrawals = this.sumByTypes(movements, [
      CashMovementType.WITHDRAWAL,
    ]);
    const correctionsOut = this.sumByTypes(movements, [
      CashMovementType.CORRECTION_OUT,
    ]);
    const openingCash = Number(session.openingCash ?? 0);
    const cashTotal = this.sumCashMovements(movements);
    const sales =
      session.sales?.filter((sale) => sale.status !== SaleStatus.CANCELLED) ??
      [];

    return {
      openingCash: this.roundMoney(openingCash),
      saleCashIn: this.roundMoney(saleCashIn),
      receivableCashIn: this.roundMoney(receivableCashIn),
      manualCashIn: this.roundMoney(manualCashIn),
      correctionsIn: this.roundMoney(correctionsIn),
      cashOut: this.roundMoney(cashOut),
      thirdPartyCashOut: this.roundMoney(thirdPartyCashOut),
      expenses: this.roundMoney(expenses),
      withdrawals: this.roundMoney(withdrawals),
      correctionsOut: this.roundMoney(correctionsOut),
      expectedCash: this.roundMoney(openingCash + cashTotal),
      salesTotal: this.roundMoney(
        sales.reduce((sum, sale) => sum + Number(sale.total ?? 0), 0),
      ),
      operationsCount: sales.length,
      receivablesCollected: this.roundMoney(
        session.receivablePayments?.reduce(
          (sum, payment) => sum + Number(payment.amount ?? 0),
          0,
        ) ?? receivableCashIn,
      ),
      movementsCount: movements.length,
    };
  }

  private emptySummary() {
    return {
      openingCash: 0,
      saleCashIn: 0,
      receivableCashIn: 0,
      manualCashIn: 0,
      correctionsIn: 0,
      cashOut: 0,
      thirdPartyCashOut: 0,
      expenses: 0,
      withdrawals: 0,
      correctionsOut: 0,
      expectedCash: 0,
      salesTotal: 0,
      operationsCount: 0,
      receivablesCollected: 0,
      movementsCount: 0,
    };
  }

  private sumByTypes(
    movements: { type: CashMovementType; amount: unknown }[],
    types: CashMovementType[],
  ) {
    const set = new Set(types);
    return movements
      .filter((movement) => set.has(movement.type))
      .reduce((sum, movement) => sum + Number(movement.amount ?? 0), 0);
  }

  private sumCashMovements(
    movements: { type: CashMovementType; amount: unknown }[],
  ) {
    return movements.reduce((sum, movement) => {
      const amount = Number(movement.amount ?? 0);

      if (POSITIVE_TYPES.has(movement.type)) return sum + amount;
      if (NEGATIVE_TYPES.has(movement.type)) return sum - amount;
      return sum;
    }, 0);
  }

  private dateRange(
    dateFrom?: string,
    dateTo?: string,
  ): Prisma.DateTimeFilter | undefined {
    if (!dateFrom && !dateTo) return undefined;

    return {
      gte: dateFrom ? new Date(dateFrom) : undefined,
      lte: dateTo ? new Date(dateTo) : undefined,
    };
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
