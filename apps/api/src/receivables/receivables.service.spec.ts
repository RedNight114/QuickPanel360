import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CashMovementType,
  MemberStatus,
  PosSessionStatus,
  ReceivableStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReceivablesService } from './receivables.service';

describe('ReceivablesService', () => {
  let service: ReceivablesService;
  let prisma: {
    receivable: {
      findMany: jest.Mock;
      aggregate: jest.Mock;
    };
    receivablePayment: {
      aggregate: jest.Mock;
    };
    member: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let auditService: { createLog: jest.Mock; createLogWithClient: jest.Mock };

  beforeEach(async () => {
    prisma = {
      receivable: {
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      receivablePayment: {
        aggregate: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    auditService = {
      createLog: jest.fn(),
      createLogWithClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceivablesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
      ],
    }).compile();

    service = module.get<ReceivablesService>(ReceivablesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('sorts pending receivables before closed ones', async () => {
      prisma.receivable.findMany.mockResolvedValue([
        { id: 'r-paid', status: ReceivableStatus.PAID },
        { id: 'r-open', status: ReceivableStatus.OPEN },
        { id: 'r-cancelled', status: ReceivableStatus.CANCELLED },
        { id: 'r-overdue', status: ReceivableStatus.OVERDUE },
      ]);

      const result = await service.findAll('tenant-1', {});

      expect(result.map((r) => r.id)).toEqual([
        'r-open',
        'r-overdue',
        'r-paid',
        'r-cancelled',
      ]);
    });

    it('builds a member search filter when q is provided', async () => {
      prisma.receivable.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', { q: '  dani  ' });

      expect(prisma.receivable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            member: {
              OR: expect.arrayContaining([
                { memberNumber: { contains: 'dani', mode: 'insensitive' } },
              ]),
            },
          }),
          take: 100,
        }),
      );
    });

    it('does not add a member filter for blank search terms', async () => {
      prisma.receivable.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', { q: '   ' });

      expect(prisma.receivable.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ member: expect.anything() }),
        }),
      );
    });
  });

  describe('findByMember', () => {
    it('throws NotFoundException when the member does not exist', async () => {
      prisma.member.findFirst.mockResolvedValue(null);

      await expect(
        service.findByMember('tenant-1', 'missing-member'),
      ).rejects.toThrow(NotFoundException);
    });

    it('excludes deleted members from the lookup', async () => {
      prisma.member.findFirst.mockResolvedValue(null);

      await expect(
        service.findByMember('tenant-1', 'member-1'),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.member.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: MemberStatus.DELETED },
          }),
        }),
      );
    });

    it('computes summary totals only from pending receivables', async () => {
      prisma.member.findFirst.mockResolvedValue({
        id: 'member-1',
        memberNumber: '0001',
        firstName: 'Dani',
        lastName: 'García',
        phone: null,
        email: null,
        status: MemberStatus.ACTIVE,
      });
      prisma.receivable.findMany.mockResolvedValue([
        {
          id: 'r-open',
          status: ReceivableStatus.OPEN,
          originalAmount: 100,
          paidAmount: 0,
          outstandingAmount: 100,
        },
        {
          id: 'r-overdue',
          status: ReceivableStatus.OVERDUE,
          originalAmount: 50,
          paidAmount: 10,
          outstandingAmount: 40,
        },
        {
          id: 'r-paid',
          status: ReceivableStatus.PAID,
          originalAmount: 30,
          paidAmount: 30,
          outstandingAmount: 0,
        },
      ]);

      const result = await service.findByMember('tenant-1', 'member-1');

      expect(result.summary).toEqual({
        totalOriginalAmount: 150,
        totalPaidAmount: 10,
        totalOutstandingAmount: 140,
        openCount: 1,
        overdueCount: 1,
      });
      expect(result.receivables).toHaveLength(3);
    });
  });

  describe('findCollectableByMember', () => {
    it('returns only pending receivables and a matching summary', async () => {
      prisma.member.findFirst.mockResolvedValue({
        id: 'member-1',
        memberNumber: '0001',
        firstName: 'Dani',
        lastName: 'García',
        phone: null,
        email: null,
        status: MemberStatus.ACTIVE,
      });
      prisma.receivable.findMany.mockResolvedValue([
        {
          id: 'r-open',
          status: ReceivableStatus.OPEN,
          originalAmount: 100,
          paidAmount: 0,
          outstandingAmount: 100,
        },
        {
          id: 'r-paid',
          status: ReceivableStatus.PAID,
          originalAmount: 30,
          paidAmount: 30,
          outstandingAmount: 0,
        },
      ]);

      const result = await service.findCollectableByMember(
        'tenant-1',
        'member-1',
      );

      expect(result.receivables).toEqual([
        expect.objectContaining({ id: 'r-open' }),
      ]);
      expect(result.summary.totalOutstandingAmount).toBe(100);
      expect(result.summary.openCount).toBe(1);
    });
  });

  describe('getSummary', () => {
    it('aggregates outstanding totals, collections and creations for today', async () => {
      prisma.receivable.findMany.mockResolvedValue([
        { outstandingAmount: 100, status: ReceivableStatus.OPEN },
        { outstandingAmount: 50, status: ReceivableStatus.PARTIALLY_PAID },
        { outstandingAmount: 25, status: ReceivableStatus.OVERDUE },
      ]);
      prisma.receivablePayment.aggregate.mockResolvedValue({
        _sum: { amount: 75 },
      });
      prisma.receivable.aggregate.mockResolvedValue({
        _sum: { originalAmount: 200 },
      });

      const result = await service.getSummary('tenant-1');

      expect(result).toEqual({
        totalOutstanding: 175,
        openCount: 1,
        partiallyPaidCount: 1,
        overdueCount: 1,
        collectedToday: 75,
        createdToday: 200,
      });
    });

    it('defaults aggregates to zero when there is no data', async () => {
      prisma.receivable.findMany.mockResolvedValue([]);
      prisma.receivablePayment.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });
      prisma.receivable.aggregate.mockResolvedValue({
        _sum: { originalAmount: null },
      });

      const result = await service.getSummary('tenant-1');

      expect(result.totalOutstanding).toBe(0);
      expect(result.collectedToday).toBe(0);
      expect(result.createdToday).toBe(0);
    });
  });

  describe('pay', () => {
    const member = {
      id: 'member-1',
      memberNumber: '0001',
      firstName: 'Dani',
      lastName: 'García',
    };

    function buildTx(receivableOverrides: Record<string, unknown> = {}) {
      return {
        receivable: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'receivable-1',
            memberId: 'member-1',
            status: ReceivableStatus.OPEN,
            originalAmount: 100,
            paidAmount: 0,
            outstandingAmount: 100,
            member,
            ...receivableOverrides,
          }),
          update: jest.fn().mockImplementation(({ data }) => ({
            id: 'receivable-1',
            memberId: 'member-1',
            member,
            ...data,
          })),
        },
        posSession: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'session-1',
            openedById: 'user-1',
            status: PosSessionStatus.OPEN,
          }),
        },
        receivablePayment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-1',
            amount: 40,
          }),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'cash-movement-1',
            type: CashMovementType.RECEIVABLE_CASH_IN,
            amount: 40,
            reason: 'Cobro de cuenta pendiente receivable-1',
          }),
        },
      };
    }

    it('throws NotFoundException when the receivable does not exist', async () => {
      const tx = buildTx();
      tx.receivable.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.pay('tenant-1', 'user-1', 'missing', { amount: 10 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects payment on an already PAID receivable', async () => {
      const tx = buildTx({ status: ReceivableStatus.PAID });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.pay('tenant-1', 'user-1', 'receivable-1', { amount: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects payment on a CANCELLED receivable', async () => {
      const tx = buildTx({ status: ReceivableStatus.CANCELLED });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.pay('tenant-1', 'user-1', 'receivable-1', { amount: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an amount greater than the outstanding balance', async () => {
      const tx = buildTx({ outstandingAmount: 30 });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.pay('tenant-1', 'user-1', 'receivable-1', { amount: 50 }),
      ).rejects.toThrow(BadRequestException);

      expect(tx.receivablePayment.create).not.toHaveBeenCalled();
    });

    it('requires an open cash session', async () => {
      const tx = buildTx();
      tx.posSession.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.pay('tenant-1', 'user-1', 'receivable-1', { amount: 40 }),
      ).rejects.toThrow(BadRequestException);

      expect(tx.receivablePayment.create).not.toHaveBeenCalled();
    });

    it('marks the receivable as PARTIALLY_PAID for a partial payment and creates a cash movement', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.pay('tenant-1', 'user-1', 'receivable-1', {
        amount: 40,
        notes: 'Pago parcial en efectivo',
      });

      expect(tx.receivable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidAmount: 40,
            outstandingAmount: 60,
            status: ReceivableStatus.PARTIALLY_PAID,
          }),
        }),
      );
      expect(tx.cashMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: CashMovementType.RECEIVABLE_CASH_IN,
            amount: 40,
            posSessionId: 'session-1',
          }),
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ action: 'receivable.payment_received' }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ action: 'cash.movement_created' }),
      );
      expect(result.receivable.status).toBe(ReceivableStatus.PARTIALLY_PAID);
      expect(result.payment.id).toBe('payment-1');
    });

    it('marks the receivable as PAID when the full outstanding amount is settled', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.pay('tenant-1', 'user-1', 'receivable-1', {
        amount: 100,
      });

      expect(tx.receivable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paidAmount: 100,
            outstandingAmount: 0,
            status: ReceivableStatus.PAID,
          }),
        }),
      );
      expect(result.receivable.status).toBe(ReceivableStatus.PAID);
    });

    it('rounds the payment amount to two decimals', async () => {
      const tx = buildTx({ outstandingAmount: 100 });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await service.pay('tenant-1', 'user-1', 'receivable-1', {
        amount: 33.333,
      });

      expect(tx.receivablePayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ amount: 33.33 }),
        }),
      );
    });
  });

  describe('cancel', () => {
    function buildTx(receivableOverrides: Record<string, unknown> = {}) {
      return {
        receivable: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'receivable-1',
            status: ReceivableStatus.OPEN,
            outstandingAmount: 100,
            ...receivableOverrides,
          }),
          update: jest.fn().mockResolvedValue({
            id: 'receivable-1',
            status: ReceivableStatus.CANCELLED,
          }),
        },
      };
    }

    it('throws NotFoundException when the receivable does not exist', async () => {
      const tx = buildTx();
      tx.receivable.findFirst.mockResolvedValue(null);
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.cancel('tenant-1', 'user-1', 'missing', {
          reason: 'Error administrativo',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects cancelling an already PAID receivable', async () => {
      const tx = buildTx({ status: ReceivableStatus.PAID });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.cancel('tenant-1', 'user-1', 'receivable-1', {
          reason: 'Error administrativo',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(tx.receivable.update).not.toHaveBeenCalled();
    });

    it('rejects cancelling an already CANCELLED receivable', async () => {
      const tx = buildTx({ status: ReceivableStatus.CANCELLED });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.cancel('tenant-1', 'user-1', 'receivable-1', {
          reason: 'Duplicado',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('cancels an OPEN receivable and writes an audit log', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.cancel(
        'tenant-1',
        'user-1',
        'receivable-1',
        { reason: 'Condonación de deuda' },
      );

      expect(tx.receivable.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'receivable-1' },
          data: { status: ReceivableStatus.CANCELLED },
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'receivable.cancelled',
          newValue: expect.objectContaining({
            cancelReason: 'Condonación de deuda',
          }),
        }),
      );
      expect(result.status).toBe(ReceivableStatus.CANCELLED);
    });
  });
});
