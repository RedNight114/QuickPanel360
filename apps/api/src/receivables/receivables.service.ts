import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovementType,
  MemberStatus,
  PosSessionStatus,
  ReceivableStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelReceivableDto } from './dto/cancel-receivable.dto';
import { PayReceivableDto } from './dto/pay-receivable.dto';
import { ReceivablesQueryDto } from './dto/receivables-query.dto';

@Injectable()
export class ReceivablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: string, query: ReceivablesQueryDto) {
    const where: Prisma.ReceivableWhereInput = {
      tenantId,
      status: query.status,
      memberId: query.memberId,
    };

    const normalizedQuery = query.q?.trim();
    if (normalizedQuery) {
      where.member = {
        OR: [
          { memberNumber: { contains: normalizedQuery, mode: 'insensitive' } },
          { firstName: { contains: normalizedQuery, mode: 'insensitive' } },
          { lastName: { contains: normalizedQuery, mode: 'insensitive' } },
          { email: { contains: normalizedQuery, mode: 'insensitive' } },
          { phone: { contains: normalizedQuery, mode: 'insensitive' } },
        ],
      };
    }

    const receivables = await this.prisma.receivable.findMany({
      where,
      take: query.take ?? 100,
      orderBy: {
        createdAt: 'desc',
      },
      include: this.receivableInclude(),
    });

    return receivables.sort((a, b) => {
      const aOpen = this.isPendingStatus(a.status) ? 0 : 1;
      const bOpen = this.isPendingStatus(b.status) ? 0 : 1;
      return aOpen - bOpen;
    });
  }

  async findByMember(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
        status: {
          not: MemberStatus.DELETED,
        },
      },
      select: {
        id: true,
        memberNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Socio no encontrado');
    }

    const receivables = await this.prisma.receivable.findMany({
      where: {
        tenantId,
        memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
      include: this.receivableInclude(),
    });

    const openReceivables = receivables.filter((receivable) =>
      this.isPendingStatus(receivable.status),
    );

    return {
      member,
      summary: {
        totalOriginalAmount: this.sumMoney(openReceivables, 'originalAmount'),
        totalPaidAmount: this.sumMoney(openReceivables, 'paidAmount'),
        totalOutstandingAmount: this.sumMoney(
          openReceivables,
          'outstandingAmount',
        ),
        openCount: openReceivables.filter(
          (receivable) => receivable.status === ReceivableStatus.OPEN,
        ).length,
        overdueCount: openReceivables.filter(
          (receivable) => receivable.status === ReceivableStatus.OVERDUE,
        ).length,
      },
      receivables,
    };
  }

  async findCollectableByMember(tenantId: string, memberId: string) {
    const data = await this.findByMember(tenantId, memberId);
    const receivables = data.receivables.filter((receivable) =>
      this.isPendingStatus(receivable.status),
    );

    return {
      ...data,
      summary: {
        ...data.summary,
        totalOriginalAmount: this.sumMoney(receivables, 'originalAmount'),
        totalPaidAmount: this.sumMoney(receivables, 'paidAmount'),
        totalOutstandingAmount: this.sumMoney(receivables, 'outstandingAmount'),
        openCount: receivables.filter(
          (receivable) => receivable.status === ReceivableStatus.OPEN,
        ).length,
        overdueCount: receivables.filter(
          (receivable) => receivable.status === ReceivableStatus.OVERDUE,
        ).length,
      },
      receivables,
    };
  }

  async getSummary(tenantId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [openReceivables, collectedToday, createdToday] = await Promise.all([
      this.prisma.receivable.findMany({
        where: {
          tenantId,
          status: {
            in: [
              ReceivableStatus.OPEN,
              ReceivableStatus.PARTIALLY_PAID,
              ReceivableStatus.OVERDUE,
            ],
          },
        },
        select: {
          outstandingAmount: true,
          status: true,
        },
      }),
      this.prisma.receivablePayment.aggregate({
        where: {
          tenantId,
          createdAt: {
            gte: startOfDay,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.receivable.aggregate({
        where: {
          tenantId,
          createdAt: {
            gte: startOfDay,
          },
        },
        _sum: {
          originalAmount: true,
        },
      }),
    ]);

    return {
      totalOutstanding: this.roundMoney(
        openReceivables.reduce(
          (sum, receivable) => sum + Number(receivable.outstandingAmount),
          0,
        ),
      ),
      openCount: openReceivables.filter(
        (receivable) => receivable.status === ReceivableStatus.OPEN,
      ).length,
      partiallyPaidCount: openReceivables.filter(
        (receivable) => receivable.status === ReceivableStatus.PARTIALLY_PAID,
      ).length,
      overdueCount: openReceivables.filter(
        (receivable) => receivable.status === ReceivableStatus.OVERDUE,
      ).length,
      collectedToday: this.roundMoney(Number(collectedToday._sum.amount ?? 0)),
      createdToday: this.roundMoney(
        Number(createdToday._sum.originalAmount ?? 0),
      ),
    };
  }

  async createManual(
    tenantId: string,
    userId: string,
    data: { memberId: string; amount: number; reason?: string; dueDate?: string },
  ) {
    await this.prisma.member.findFirstOrThrow({
      where: { id: data.memberId, tenantId },
    });

    return this.prisma.receivable.create({
      data: {
        tenantId,
        memberId: data.memberId,
        originalAmount: data.amount,
        paidAmount: 0,
        outstandingAmount: data.amount,
        status: 'OPEN',
        reason: data.reason ?? 'Cuenta manual',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        createdById: userId,
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true, memberNumber: true } },
      },
    });
  }

  async pay(
    tenantId: string,
    userId: string,
    receivableId: string,
    payReceivableDto: PayReceivableDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const receivable = await tx.receivable.findFirst({
        where: {
          id: receivableId,
          tenantId,
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
        },
      });

      if (!receivable) {
        throw new NotFoundException('Cuenta pendiente no encontrada');
      }

      if (
        receivable.status === ReceivableStatus.PAID ||
        receivable.status === ReceivableStatus.CANCELLED
      ) {
        throw new BadRequestException('Esta cuenta pendiente no admite cobros');
      }

      const amount = this.roundMoney(payReceivableDto.amount);
      const previousOutstandingAmount = Number(receivable.outstandingAmount);

      if (amount > previousOutstandingAmount) {
        throw new BadRequestException(
          'El importe no puede superar el pendiente de la cuenta.',
        );
      }

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
          'Debes tener una caja abierta para cobrar una cuenta pendiente.',
        );
      }

      const newPaidAmount = this.roundMoney(
        Number(receivable.paidAmount) + amount,
      );
      const newOutstandingAmount = this.roundMoney(
        previousOutstandingAmount - amount,
      );
      const newStatus =
        newOutstandingAmount === 0
          ? ReceivableStatus.PAID
          : ReceivableStatus.PARTIALLY_PAID;

      const [payment, updatedReceivable, cashMovement] = await Promise.all([
        tx.receivablePayment.create({
          data: {
            tenantId,
            receivableId: receivable.id,
            memberId: receivable.memberId,
            posSessionId: session.id,
            amount,
            notes: payReceivableDto.notes,
            receivedById: userId,
          },
        }),
        tx.receivable.update({
          where: {
            id: receivable.id,
          },
          data: {
            paidAmount: newPaidAmount,
            outstandingAmount: newOutstandingAmount,
            status: newStatus,
          },
          include: this.receivableInclude(),
        }),
        tx.cashMovement.create({
          data: {
            tenantId,
            posSessionId: session.id,
            type: CashMovementType.RECEIVABLE_CASH_IN,
            amount,
            reason: `Cobro de cuenta pendiente ${receivable.id}`,
            createdById: userId,
          },
        }),
      ]);

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'receivable.payment_received',
        entityType: 'receivable_payment',
        entityId: payment.id,
        oldValue: {
          receivableId: receivable.id,
          outstandingAmount: previousOutstandingAmount,
          status: receivable.status,
        },
        newValue: {
          receivableId: receivable.id,
          memberId: receivable.memberId,
          memberName: `${receivable.member.firstName} ${receivable.member.lastName}`,
          amount,
          previousOutstandingAmount,
          newOutstandingAmount,
          posSessionId: session.id,
          notes: payReceivableDto.notes,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'cash.movement_created',
        entityType: 'cash_movement',
        entityId: cashMovement.id,
        newValue: {
          type: cashMovement.type,
          amount,
          reason: cashMovement.reason,
          posSessionId: session.id,
          receivableId: receivable.id,
        },
      });

      return {
        receivable: updatedReceivable,
        payment,
        cashMovement,
      };
    });
  }

  async approve(tenantId: string, userId: string, receivableId: string) {
    return this.prisma.$transaction(async (tx) => {
      const receivable = await tx.receivable.findFirst({
        where: { id: receivableId, tenantId },
      });

      if (!receivable) {
        throw new NotFoundException('Cuenta pendiente no encontrada');
      }

      if (receivable.approvedById) {
        throw new BadRequestException('Esta cuenta pendiente ya fue aprobada');
      }

      const updated = await tx.receivable.update({
        where: { id: receivableId },
        data: { approvedById: userId },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'receivable.approved',
        entityType: 'receivable',
        entityId: receivableId,
        newValue: { approvedById: userId },
      });

      return updated;
    });
  }

  async cancel(
    tenantId: string,
    userId: string,
    receivableId: string,
    cancelReceivableDto: CancelReceivableDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const receivable = await tx.receivable.findFirst({
        where: {
          id: receivableId,
          tenantId,
        },
      });

      if (!receivable) {
        throw new NotFoundException('Cuenta pendiente no encontrada');
      }

      if (
        receivable.status === ReceivableStatus.PAID ||
        receivable.status === ReceivableStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Esta cuenta pendiente no se puede cancelar',
        );
      }

      const updatedReceivable = await tx.receivable.update({
        where: {
          id: receivable.id,
        },
        data: {
          status: ReceivableStatus.CANCELLED,
        },
        include: this.receivableInclude(),
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'receivable.cancelled',
        entityType: 'receivable',
        entityId: receivable.id,
        oldValue: {
          status: receivable.status,
          outstandingAmount: Number(receivable.outstandingAmount),
        },
        newValue: {
          status: updatedReceivable.status,
          cancelReason: cancelReceivableDto.reason,
        },
      });

      return updatedReceivable;
    });
  }

  private receivableInclude() {
    return {
      member: {
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          status: true,
        },
      },
      sale: {
        select: {
          id: true,
          total: true,
          createdAt: true,
          settlementStatus: true,
        },
      },
      payments: {
        orderBy: {
          createdAt: 'desc' as const,
        },
        take: 5,
        include: {
          receivedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };
  }

  private isPendingStatus(status: ReceivableStatus) {
    return new Set<ReceivableStatus>([
      ReceivableStatus.OPEN,
      ReceivableStatus.PARTIALLY_PAID,
      ReceivableStatus.OVERDUE,
    ]).has(status);
  }

  private sumMoney<T extends Record<string, unknown>>(
    records: T[],
    field: keyof T,
  ) {
    return this.roundMoney(
      records.reduce((sum, record) => sum + Number(record[field] ?? 0), 0),
    );
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }
}
