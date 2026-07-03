import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  CashMovementType,
  PosSessionStatus,
  ThirdPartyPaymentCategory,
  ThirdPartyPaymentStatus,
  ThirdPartyStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThirdPartyPaymentsService } from './third-party-payments.service';

describe('ThirdPartyPaymentsService', () => {
  let service: ThirdPartyPaymentsService;
  let prisma: {
    $transaction: jest.Mock;
    thirdPartyPayment: { findMany: jest.Mock };
  };
  let auditService: { createLogWithClient: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      thirdPartyPayment: {
        findMany: jest.fn(),
      },
    };
    auditService = {
      createLogWithClient: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThirdPartyPaymentsService,
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

    service = module.get<ThirdPartyPaymentsService>(ThirdPartyPaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('applies tenant, thirdPartyId, category and status filters with the default take', async () => {
      prisma.thirdPartyPayment.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', {
        thirdPartyId: 'third-party-1',
        category: ThirdPartyPaymentCategory.SUPPLIER_PAYMENT,
        status: ThirdPartyPaymentStatus.PAID,
      });

      expect(prisma.thirdPartyPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            thirdPartyId: 'third-party-1',
            category: ThirdPartyPaymentCategory.SUPPLIER_PAYMENT,
            status: ThirdPartyPaymentStatus.PAID,
            createdAt: undefined,
          },
          take: 100,
        }),
      );
    });

    it('builds a date range filter when dateFrom/dateTo are provided', async () => {
      prisma.thirdPartyPayment.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-15',
        take: 50,
      });

      expect(prisma.thirdPartyPayment.findMany).toHaveBeenCalledWith(
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

    it('builds an OR search filter across reason, notes and third party fields when q is provided', async () => {
      prisma.thirdPartyPayment.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', { q: '  transporte  ' });

      expect(prisma.thirdPartyPayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { reason: { contains: 'transporte', mode: 'insensitive' } },
              { notes: { contains: 'transporte', mode: 'insensitive' } },
              {
                thirdParty: {
                  name: { contains: 'transporte', mode: 'insensitive' },
                },
              },
              {
                thirdParty: {
                  documentNumber: {
                    contains: 'transporte',
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }),
        }),
      );
    });

    it('does not add an OR filter when q is blank', async () => {
      prisma.thirdPartyPayment.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', { q: '   ' });

      const call = prisma.thirdPartyPayment.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeUndefined();
    });
  });

  describe('create', () => {
    const baseDto = {
      thirdPartyId: 'third-party-1',
      amount: 49.999,
      reason: '  Pago de transporte  ',
      notes: 'Detalle',
    };

    function buildTx(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        thirdParty: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'third-party-1',
            name: 'Transportes SL',
            status: ThirdPartyStatus.ACTIVE,
          }),
        },
        posSession: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'session-1',
            openedById: 'user-1',
            status: PosSessionStatus.OPEN,
            openedAt: new Date(),
          }),
        },
        thirdPartyPayment: {
          create: jest.fn().mockResolvedValue({
            id: 'payment-1',
            amount: 50,
            category: ThirdPartyPaymentCategory.OTHER,
            reason: 'Pago de transporte',
          }),
          update: jest.fn().mockResolvedValue({
            id: 'payment-1',
            amount: 50,
            category: ThirdPartyPaymentCategory.OTHER,
            reason: 'Pago de transporte',
            cashMovementId: 'cash-1',
          }),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'cash-1',
            type: CashMovementType.THIRD_PARTY_CASH_OUT,
            amount: 50,
            reason: 'Pago a tercero: Pago de transporte',
          }),
        },
        ...overrides,
      };
    }

    it('throws NotFoundException when thirdPartyId is provided but not found for the tenant', async () => {
      const tx = buildTx({
        thirdParty: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.create('tenant-1', 'user-1', baseDto),
      ).rejects.toThrow(NotFoundException);

      expect(tx.posSession.findFirst).not.toHaveBeenCalled();
      expect(tx.thirdPartyPayment.create).not.toHaveBeenCalled();
    });

    it('excludes archived third parties from lookup', async () => {
      const tx = buildTx({
        thirdParty: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.create('tenant-1', 'user-1', baseDto),
      ).rejects.toThrow(NotFoundException);

      expect(tx.thirdParty.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'third-party-1',
          tenantId: 'tenant-1',
          status: { not: ThirdPartyStatus.ARCHIVED },
        },
      });
    });

    it('allows creating a payment without a third party (anonymous payment)', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await service.create('tenant-1', 'user-1', {
        ...baseDto,
        thirdPartyId: undefined,
      });

      expect(tx.thirdParty.findFirst).not.toHaveBeenCalled();
      expect(tx.thirdPartyPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thirdPartyId: undefined,
          }),
        }),
      );
    });

    it('throws BadRequestException when the user has no open cash session', async () => {
      const tx = buildTx({
        posSession: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.create('tenant-1', 'user-1', baseDto),
      ).rejects.toThrow(BadRequestException);

      expect(tx.thirdPartyPayment.create).not.toHaveBeenCalled();
    });

    it('rounds the amount to 2 decimals, trims the reason, defaults the category to OTHER and creates a linked cash movement', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.create('tenant-1', 'user-1', baseDto);

      expect(tx.thirdPartyPayment.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          thirdPartyId: 'third-party-1',
          posSessionId: 'session-1',
          amount: 50,
          category: ThirdPartyPaymentCategory.OTHER,
          reason: 'Pago de transporte',
          notes: 'Detalle',
          paidById: 'user-1',
        },
      });

      expect(tx.cashMovement.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          posSessionId: 'session-1',
          type: CashMovementType.THIRD_PARTY_CASH_OUT,
          amount: 50,
          reason: 'Pago a tercero: Pago de transporte',
          createdById: 'user-1',
        },
      });

      expect(tx.thirdPartyPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: { cashMovementId: 'cash-1' },
        }),
      );

      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'third_party_payment.created',
          entityType: 'third_party_payment',
          entityId: 'payment-1',
          newValue: expect.objectContaining({
            thirdPartyId: 'third-party-1',
            thirdPartyName: 'Transportes SL',
            amount: 50,
            category: ThirdPartyPaymentCategory.OTHER,
            reason: 'Pago de transporte',
          }),
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'cash.movement_created',
          entityType: 'cash_movement',
          entityId: 'cash-1',
        }),
      );

      expect(result.payment.id).toBe('payment-1');
      expect(result.cashMovement.id).toBe('cash-1');
    });

    it('respects an explicitly provided category', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await service.create('tenant-1', 'user-1', {
        ...baseDto,
        category: ThirdPartyPaymentCategory.SUPPLIER_PAYMENT,
      });

      expect(tx.thirdPartyPayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: ThirdPartyPaymentCategory.SUPPLIER_PAYMENT,
          }),
        }),
      );
    });
  });

  describe('cancel', () => {
    const dto = { reason: '  Error en el importe  ' };

    function buildTx(overrides: Partial<Record<string, unknown>> = {}) {
      return {
        thirdPartyPayment: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'payment-1',
            tenantId: 'tenant-1',
            posSessionId: 'session-1',
            amount: 50,
            status: ThirdPartyPaymentStatus.PAID,
            thirdParty: { id: 'third-party-1', name: 'Transportes SL' },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'payment-1',
            status: ThirdPartyPaymentStatus.CANCELLED,
            cancelReason: 'Error en el importe',
          }),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'correction-1',
            type: CashMovementType.CORRECTION_IN,
            amount: 50,
            reason:
              'Anulación de pago a tercero payment-1: Error en el importe',
          }),
        },
        ...overrides,
      };
    }

    it('throws NotFoundException when the payment does not exist for the tenant', async () => {
      const tx = buildTx({
        thirdPartyPayment: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn(),
        },
      });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.cancel('tenant-1', 'user-1', 'missing-payment', dto),
      ).rejects.toThrow(NotFoundException);

      expect(tx.cashMovement.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the payment is not in PAID status', async () => {
      const tx = buildTx({
        thirdPartyPayment: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'payment-1',
            tenantId: 'tenant-1',
            posSessionId: 'session-1',
            amount: 50,
            status: ThirdPartyPaymentStatus.CANCELLED,
            thirdParty: null,
          }),
          update: jest.fn(),
        },
      });
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await expect(
        service.cancel('tenant-1', 'user-1', 'payment-1', dto),
      ).rejects.toThrow(BadRequestException);

      expect(tx.cashMovement.create).not.toHaveBeenCalled();
    });

    it('creates a CORRECTION_IN cash movement, trims the reason and marks the payment as CANCELLED', async () => {
      const tx = buildTx();
      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      const result = await service.cancel(
        'tenant-1',
        'user-1',
        'payment-1',
        dto,
      );

      expect(tx.cashMovement.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          posSessionId: 'session-1',
          type: CashMovementType.CORRECTION_IN,
          amount: 50,
          reason: 'Anulación de pago a tercero payment-1: Error en el importe',
          createdById: 'user-1',
        },
      });

      expect(tx.thirdPartyPayment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'payment-1' },
          data: expect.objectContaining({
            status: ThirdPartyPaymentStatus.CANCELLED,
            cancelledById: 'user-1',
            cancelReason: 'Error en el importe',
          }),
        }),
      );

      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'third_party_payment.cancelled',
          entityType: 'third_party_payment',
          entityId: 'payment-1',
          oldValue: { status: ThirdPartyPaymentStatus.PAID, amount: 50 },
        }),
      );
      expect(auditService.createLogWithClient).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({
          action: 'cash.movement_created',
          entityType: 'cash_movement',
          entityId: 'correction-1',
        }),
      );

      expect(result.payment.status).toBe(ThirdPartyPaymentStatus.CANCELLED);
      expect(result.cashMovement.id).toBe('correction-1');
    });
  });
});
