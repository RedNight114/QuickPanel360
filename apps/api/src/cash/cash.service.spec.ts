import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementType, PosSessionStatus, SaleStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CashService } from './cash.service';

describe('CashService', () => {
  let service: CashService;
  let prisma: {
    posSession: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    cashMovement: { findMany: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
  };
  let auditService: { createLog: jest.Mock; createLogWithClient: jest.Mock };

  beforeEach(async () => {
    prisma = {
      posSession: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      cashMovement: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    auditService = {
      createLog: jest.fn(),
      createLogWithClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashService,
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

    service = module.get<CashService>(CashService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentSummary', () => {
    it('returns an empty summary when there is no open session', async () => {
      prisma.posSession.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentSummary('tenant-1', 'user-1');

      expect(result).toEqual({
        session: null,
        summary: {
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
        },
        recentMovements: [],
      });
    });

    it('computes expected cash and totals from movements, sales and receivables', async () => {
      prisma.posSession.findFirst.mockResolvedValue({
        id: 'session-1',
        openedAt: new Date('2026-06-16T08:00:00Z'),
        openingCash: 100,
        status: PosSessionStatus.OPEN,
        openedBy: { id: 'user-1', name: 'Cajero', email: 'cajero@test.com' },
        cashMovements: [
          { type: CashMovementType.SALE_CASH_IN, amount: 50 },
          { type: CashMovementType.RECEIVABLE_CASH_IN, amount: 20 },
          { type: CashMovementType.CASH_IN, amount: 10 },
          { type: CashMovementType.WITHDRAWAL, amount: 30 },
          { type: CashMovementType.EXPENSE, amount: 5 },
        ],
        sales: [
          { id: 'sale-1', total: 50, status: SaleStatus.COMPLETED },
          { id: 'sale-2', total: 999, status: SaleStatus.CANCELLED },
        ],
        receivablePayments: [{ amount: 20 }],
      });

      const result = await service.getCurrentSummary('tenant-1', 'user-1');

      expect(result.session).toEqual(
        expect.objectContaining({ id: 'session-1', openingCash: 100 }),
      );
      // expectedCash = openingCash(100) + saleCashIn(50) + receivableCashIn(20) + manualCashIn(10) - withdrawals(30) - expenses(5)
      expect(result.summary).toEqual(
        expect.objectContaining({
          openingCash: 100,
          saleCashIn: 50,
          receivableCashIn: 20,
          manualCashIn: 10,
          withdrawals: 30,
          expenses: 5,
          expectedCash: 145,
          salesTotal: 50,
          operationsCount: 1,
          receivablesCollected: 20,
          movementsCount: 5,
        }),
      );
      expect(result.recentMovements).toHaveLength(5);
    });

    it('limits recentMovements to the 10 most recent', async () => {
      const movements = Array.from({ length: 15 }, (_, i) => ({
        id: `mov-${i}`,
        type: CashMovementType.CASH_IN,
        amount: 1,
      }));

      prisma.posSession.findFirst.mockResolvedValue({
        id: 'session-1',
        openedAt: new Date(),
        openingCash: 0,
        status: PosSessionStatus.OPEN,
        openedBy: { id: 'user-1', name: 'Cajero', email: 'cajero@test.com' },
        cashMovements: movements,
        sales: [],
        receivablePayments: [],
      });

      const result = await service.getCurrentSummary('tenant-1', 'user-1');

      expect(result.recentMovements).toHaveLength(10);
    });
  });

  describe('findMovements', () => {
    it('applies filters and the default take of 150', async () => {
      prisma.cashMovement.findMany.mockResolvedValue([]);

      await service.findMovements('tenant-1', {});

      expect(prisma.cashMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            posSessionId: undefined,
            type: undefined,
          }),
          take: 150,
        }),
      );
    });

    it('builds a date range filter when dateFrom/dateTo are provided', async () => {
      prisma.cashMovement.findMany.mockResolvedValue([]);

      await service.findMovements('tenant-1', {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-15',
        take: 50,
      });

      expect(prisma.cashMovement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: new Date('2026-06-01'),
              lte: new Date('2026-06-15'),
            },
          }),
          take: 50,
        }),
      );
    });
  });

  describe('findSessionById', () => {
    it('throws NotFoundException when the session does not exist', async () => {
      prisma.posSession.findFirst.mockResolvedValue(null);

      await expect(
        service.findSessionById('tenant-1', 'missing-session'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the session with a computed summary', async () => {
      prisma.posSession.findFirst.mockResolvedValue({
        id: 'session-1',
        openingCash: 0,
        cashMovements: [{ type: CashMovementType.SALE_CASH_IN, amount: 25 }],
        sales: [],
        receivablePayments: [],
      });

      const result = await service.findSessionById('tenant-1', 'session-1');

      expect(result.summary.saleCashIn).toBe(25);
      expect(result.summary.expectedCash).toBe(25);
    });
  });

  describe('createMovement', () => {
    const baseDto = {
      type: CashMovementType.CASH_IN,
      amount: 25,
      reason: 'Aporte de caja',
    };

    it('rejects non-manual movement types', async () => {
      await expect(
        service.createMovement('tenant-1', 'user-1', [], {
          ...baseDto,
          type: CashMovementType.SALE_CASH_IN,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects WITHDRAWAL without cash.withdraw permission', async () => {
      await expect(
        service.createMovement('tenant-1', 'user-1', [], {
          ...baseDto,
          type: CashMovementType.WITHDRAWAL,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects EXPENSE without cash.expense permission', async () => {
      await expect(
        service.createMovement('tenant-1', 'user-1', [], {
          ...baseDto,
          type: CashMovementType.EXPENSE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects CORRECTION_IN/OUT without cash.correction permission', async () => {
      await expect(
        service.createMovement('tenant-1', 'user-1', [], {
          ...baseDto,
          type: CashMovementType.CORRECTION_OUT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows WITHDRAWAL when the user has cash.withdraw permission', async () => {
      const tx = {
        posSession: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'session-1',
            openedAt: new Date(),
          }),
          findUnique: jest.fn().mockResolvedValue({
            openingCash: 100,
            cashMovements: [],
            sales: [],
            receivablePayments: [],
          }),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-1',
            type: CashMovementType.WITHDRAWAL,
            amount: 25,
            reason: 'Retirada de efectivo',
          }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.createMovement(
        'tenant-1',
        'user-1',
        ['cash.withdraw'],
        {
          ...baseDto,
          type: CashMovementType.WITHDRAWAL,
          reason: 'Retirada de efectivo',
        },
      );

      expect(tx.cashMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            posSessionId: 'session-1',
            type: CashMovementType.WITHDRAWAL,
            amount: 25,
            reason: 'Retirada de efectivo',
            createdById: 'user-1',
          }),
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'cash.manual_movement_created',
          entityType: 'cash_movement',
          entityId: 'movement-1',
        }),
      );
      expect(result.movement.id).toBe('movement-1');
      expect(result.summary).not.toBeNull();
    });

    it('appends notes to the reason when provided', async () => {
      const tx = {
        posSession: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'session-1',
            openedAt: new Date(),
          }),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-2',
            type: CashMovementType.CASH_IN,
            amount: 25,
            reason: 'Aporte de caja · Detalle adicional',
          }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await service.createMovement('tenant-1', 'user-1', [], {
        ...baseDto,
        notes: 'Detalle adicional',
      });

      expect(tx.cashMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Aporte de caja · Detalle adicional',
          }),
        }),
      );
    });

    it('throws when the user has no open cash session', async () => {
      const tx = {
        posSession: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        cashMovement: {
          create: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.createMovement('tenant-1', 'user-1', [], baseDto),
      ).rejects.toThrow(BadRequestException);

      expect(tx.cashMovement.create).not.toHaveBeenCalled();
    });

    it('returns a null summary when the session cannot be refreshed', async () => {
      const tx = {
        posSession: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'session-1',
            openedAt: new Date(),
          }),
          findUnique: jest.fn().mockResolvedValue(null),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'movement-3',
            type: CashMovementType.CASH_IN,
            amount: 25,
            reason: 'Aporte de caja',
          }),
        },
      };
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.createMovement(
        'tenant-1',
        'user-1',
        [],
        baseDto,
      );

      expect(result.summary).toBeNull();
    });
  });
});
