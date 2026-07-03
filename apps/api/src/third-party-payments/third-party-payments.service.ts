import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovementType,
  PosSessionStatus,
  ThirdPartyPaymentCategory,
  ThirdPartyPaymentStatus,
  ThirdPartyStatus,
} from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CancelThirdPartyPaymentDto } from './dto/cancel-third-party-payment.dto';
import { CreateThirdPartyPaymentDto } from './dto/create-third-party-payment.dto';
import { ThirdPartyPaymentsQueryDto } from './dto/third-party-payments-query.dto';

@Injectable()
export class ThirdPartyPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: string, query: ThirdPartyPaymentsQueryDto) {
    const where: Prisma.ThirdPartyPaymentWhereInput = {
      tenantId,
      thirdPartyId: query.thirdPartyId,
      category: query.category,
      status: query.status,
      createdAt: this.dateRange(query.dateFrom, query.dateTo),
    };

    const normalizedQuery = query.q?.trim();
    if (normalizedQuery) {
      where.OR = [
        { reason: { contains: normalizedQuery, mode: 'insensitive' } },
        { notes: { contains: normalizedQuery, mode: 'insensitive' } },
        {
          thirdParty: {
            name: { contains: normalizedQuery, mode: 'insensitive' },
          },
        },
        {
          thirdParty: {
            documentNumber: { contains: normalizedQuery, mode: 'insensitive' },
          },
        },
      ];
    }

    const payments = await this.prisma.thirdPartyPayment.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: query.take ?? 100,
      include: this.paymentInclude(),
    });

    return payments.map((p) => ({ ...p, amount: Number(p.amount) }));
  }

  async create(
    tenantId: string,
    userId: string,
    dto: CreateThirdPartyPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const thirdParty = dto.thirdPartyId
        ? await tx.thirdParty.findFirst({
            where: {
              id: dto.thirdPartyId,
              tenantId,
              status: {
                not: ThirdPartyStatus.ARCHIVED,
              },
            },
          })
        : null;

      if (dto.thirdPartyId && !thirdParty) {
        throw new NotFoundException('Tercero no encontrado');
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
          'Debes tener una caja abierta para registrar un pago a tercero.',
        );
      }

      const amount = this.roundMoney(dto.amount);
      const reason = dto.reason.trim();
      const category = dto.category ?? ThirdPartyPaymentCategory.OTHER;

      const payment = await tx.thirdPartyPayment.create({
        data: {
          tenantId,
          thirdPartyId: thirdParty?.id,
          posSessionId: session.id,
          amount,
          category,
          reason,
          notes: dto.notes,
          paidById: userId,
        },
      });

      const cashMovement = await tx.cashMovement.create({
        data: {
          tenantId,
          posSessionId: session.id,
          type: CashMovementType.THIRD_PARTY_CASH_OUT,
          amount,
          reason: `Pago a tercero: ${reason}`,
          createdById: userId,
        },
      });

      const updatedPayment = await tx.thirdPartyPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          cashMovementId: cashMovement.id,
        },
        include: this.paymentInclude(),
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'third_party_payment.created',
        entityType: 'third_party_payment',
        entityId: payment.id,
        newValue: {
          thirdPartyId: thirdParty?.id,
          thirdPartyName: thirdParty?.name,
          amount,
          category,
          reason,
          notes: dto.notes,
          posSessionId: session.id,
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
          thirdPartyPaymentId: payment.id,
          thirdPartyName: thirdParty?.name,
        },
      });

      return {
        payment: updatedPayment,
        cashMovement,
      };
    });
  }

  async cancel(
    tenantId: string,
    userId: string,
    id: string,
    dto: CancelThirdPartyPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.thirdPartyPayment.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          thirdParty: true,
        },
      });

      if (!payment) {
        throw new NotFoundException('Pago a tercero no encontrado');
      }

      if (payment.status !== ThirdPartyPaymentStatus.PAID) {
        throw new BadRequestException('Este pago no se puede cancelar');
      }

      const reason = dto.reason.trim();
      const amount = Number(payment.amount);

      const correctionMovement = await tx.cashMovement.create({
        data: {
          tenantId,
          posSessionId: payment.posSessionId,
          type: CashMovementType.CORRECTION_IN,
          amount,
          reason: `Anulación de pago a tercero ${payment.id}: ${reason}`,
          createdById: userId,
        },
      });

      const updatedPayment = await tx.thirdPartyPayment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: ThirdPartyPaymentStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledById: userId,
          cancelReason: reason,
        },
        include: this.paymentInclude(),
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'third_party_payment.cancelled',
        entityType: 'third_party_payment',
        entityId: payment.id,
        oldValue: {
          status: payment.status,
          amount,
        },
        newValue: {
          status: updatedPayment.status,
          cancelReason: reason,
          correctionMovementId: correctionMovement.id,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'cash.movement_created',
        entityType: 'cash_movement',
        entityId: correctionMovement.id,
        newValue: {
          type: correctionMovement.type,
          amount,
          reason: correctionMovement.reason,
          posSessionId: payment.posSessionId,
          thirdPartyPaymentId: payment.id,
        },
      });

      return {
        payment: updatedPayment,
        cashMovement: correctionMovement,
      };
    });
  }

  private paymentInclude() {
    return {
      thirdParty: true,
      posSession: {
        select: {
          id: true,
          openedAt: true,
          status: true,
        },
      },
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      cancelledBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };
  }

  async getSummaryByCategory(
    tenantId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const grouped = await this.prisma.thirdPartyPayment.groupBy({
      by: ['category'],
      where: {
        tenantId,
        status: ThirdPartyPaymentStatus.PAID,
        createdAt: this.dateRange(dateFrom, dateTo),
      },
      _count: { _all: true },
      _sum: { amount: true },
    });

    return grouped.map((item) => ({
      category: item.category,
      count: item._count._all,
      total: this.roundMoney(Number(item._sum.amount ?? 0)),
    }));
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
