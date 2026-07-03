import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  CashMovementType,
  InventoryMovementType,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  SaleItemPricingMode,
  SaleStatus,
  ScaleToleranceAction,
  SettlementStatus,
  UnitType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { MemberDiscountService } from '../members/member-discount.service';
import { PrismaService } from '../prisma/prisma.service';
import { PosService } from './pos.service';

describe('PosService', () => {
  let service: PosService;
  let prisma: { $transaction: jest.Mock };
  let auditService: { createLogWithClient: jest.Mock; createLog: jest.Mock };
  let memberDiscountService: { calculateMemberDiscounts: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
    };
    auditService = {
      createLog: jest.fn(),
      createLogWithClient: jest.fn(),
    };
    memberDiscountService = {
      calculateMemberDiscounts: jest.fn().mockResolvedValue({
        memberDiscount: null,
        benefits: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PosService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuditService,
          useValue: auditService,
        },
        {
          provide: MemberDiscountService,
          useValue: memberDiscountService,
        },
        {
          provide: CacheInvalidationService,
          useValue: { afterSale: jest.fn(), afterCashClose: jest.fn(), afterInventoryChange: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<PosService>(PosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('scale verification', () => {
    const baseContext = {
      isBulk: true,
      requestedQuantity: 0.001,
      currentQuantity: 1,
      productName: 'Gelato',
      settings: {
        scaleVerificationEnabled: true,
        requireScaleVerification: true,
        maxWastePerLineGrams: 0.05,
        maxWastePercent: 5,
        scaleToleranceAction: ScaleToleranceAction.BLOCK as ScaleToleranceAction,
        allowUnderWeight: false,
      },
      canOverrideScaleTolerance: false,
    };

    function resolveScaleData(
      item: Parameters<PosService['normalizeSaleItem']>[0],
      context = baseContext,
    ) {
      return (
        service as unknown as {
          resolveScaleData: (
            item: unknown,
            context: typeof baseContext,
          ) => {
            actualWeight: number;
            weightDifference: number;
            wasteQuantity: number;
            scaleVerified: boolean;
            scaleToleranceExceeded: boolean;
          } | null;
        }
      ).resolveScaleData(item, context);
    }

    function normalizeSaleItem(
      item: Parameters<PosService['normalizeSaleItem']>[0],
      product: Parameters<PosService['normalizeSaleItem']>[1],
    ) {
      return (
        service as unknown as {
          normalizeSaleItem: PosService['normalizeSaleItem'];
        }
      ).normalizeSaleItem(item, product);
    }

    it('calculates real weight and automatic waste for over-dispensation', () => {
      const result = resolveScaleData({
        productId: 'product-1',
        pricingMode: SaleItemPricingMode.BY_WEIGHT,
        actualWeightGrams: 1.02,
        scaleVerified: true,
      });

      expect(result).toEqual(
        expect.objectContaining({
          actualWeight: 0.00102,
          weightDifference: 0.00002,
          wasteQuantity: 0.00002,
          scaleVerified: true,
          scaleToleranceExceeded: false,
        }),
      );
    });

    it('requires actual weight when configured as mandatory', () => {
      expect(() =>
        resolveScaleData({
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_WEIGHT,
        }),
      ).toThrow(BadRequestException);
    });

    it('blocks under-weight by default', () => {
      expect(() =>
        resolveScaleData({
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_WEIGHT,
          actualWeightGrams: 0.98,
          scaleVerified: true,
        }),
      ).toThrow('inferior a lo solicitado');
    });

    it('allows under-weight with traceability when configured', () => {
      const result = resolveScaleData(
        {
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_WEIGHT,
          actualWeightGrams: 0.98,
          scaleVerified: true,
        },
        {
          ...baseContext,
          settings: {
            ...baseContext.settings,
            allowUnderWeight: true,
          },
        },
      );

      expect(result).toEqual(
        expect.objectContaining({
          actualWeight: 0.00098,
          weightDifference: -0.00002,
          wasteQuantity: 0,
          scaleVerified: true,
          scaleToleranceExceeded: false,
        }),
      );
    });

    it('keeps requested euro amount while validating real weight', () => {
      const normalized = normalizeSaleItem(
        {
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_AMOUNT,
          amountEuros: 5,
        },
        {
          unitType: UnitType.KG,
          price: 8.5,
        },
      );

      const result = resolveScaleData(
        {
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_AMOUNT,
          amountEuros: 5,
          actualWeightGrams: 0.6,
          scaleVerified: true,
        },
        {
          ...baseContext,
          requestedQuantity: normalized.quantity,
          settings: {
            ...baseContext.settings,
            maxWastePerLineGrams: 0.05,
            maxWastePercent: 5,
          },
        },
      );

      expect(normalized).toEqual(
        expect.objectContaining({
          quantity: 0.000588,
          total: 5,
          requestedAmount: 5,
          pricingMode: SaleItemPricingMode.BY_AMOUNT,
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          actualWeight: 0.0006,
          weightDifference: 0.000012,
          wasteQuantity: 0.000012,
          scaleVerified: true,
        }),
      );
    });

    it('blocks waste above tolerance when action is BLOCK', () => {
      expect(() =>
        resolveScaleData({
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_WEIGHT,
          actualWeightGrams: 1.2,
          scaleVerified: true,
        }),
      ).toThrow('supera la tolerancia configurada');
    });

    it('allows manager override with permission and reason when configured', () => {
      const result = resolveScaleData(
        {
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_WEIGHT,
          actualWeightGrams: 1.2,
          scaleVerified: true,
          scaleOverrideReason: 'Dispensación validada por manager',
        },
        {
          ...baseContext,
          canOverrideScaleTolerance: true,
          settings: {
            ...baseContext.settings,
            scaleToleranceAction:
              ScaleToleranceAction.REQUIRE_MANAGER_CONFIRMATION,
          },
        },
      );

      expect(result).toEqual(
        expect.objectContaining({
          scaleToleranceExceeded: true,
          scaleOverridden: true,
        }),
      );
    });

    it('requires override permission and reason for manager confirmation action', () => {
      expect(() =>
        resolveScaleData(
          {
            productId: 'product-1',
            pricingMode: SaleItemPricingMode.BY_WEIGHT,
            actualWeightGrams: 1.2,
            scaleVerified: true,
          },
          {
            ...baseContext,
            settings: {
              ...baseContext.settings,
              scaleToleranceAction:
                ScaleToleranceAction.REQUIRE_MANAGER_CONFIRMATION,
            },
          },
        ),
      ).toThrow('requiere autorización de manager');
    });

    it('allows optional flow without actual weight when verification is not required', () => {
      const result = resolveScaleData(
        {
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_WEIGHT,
        },
        {
          ...baseContext,
          settings: {
            ...baseContext.settings,
            requireScaleVerification: false,
          },
        },
      );

      expect(result).toBeNull();
    });

    it('ignores scale data for unit products', () => {
      const result = resolveScaleData(
        {
          productId: 'product-1',
          pricingMode: SaleItemPricingMode.BY_UNIT,
          actualWeightGrams: 1.2,
          scaleVerified: true,
        },
        {
          ...baseContext,
          isBulk: false,
        },
      );

      expect(result).toBeNull();
    });
  });

  describe('createSale scale inventory flow', () => {
    it('charges requested weight, discounts real weight and registers scale waste', async () => {
      const tx = {
        posSession: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'session-1',
            status: 'OPEN',
            openedById: 'user-1',
          }),
        },
        member: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'member-1',
            status: 'ACTIVE',
          }),
        },
        tenantSettings: {
          upsert: jest.fn().mockResolvedValue({
            scaleVerificationEnabled: true,
            requireScaleVerification: true,
            maxWastePerLineGrams: 0.05,
            maxWastePercent: 5,
            scaleToleranceAction: ScaleToleranceAction.BLOCK,
            allowUnderWeight: false,
            autoRegisterScaleWaste: true,
            scaleWasteReason: 'Diferencia por peso real en báscula',
          }),
        },
        product: {
          findMany: jest.fn().mockResolvedValue([{
            id: 'product-1',
            name: 'Gelato',
            unitType: UnitType.KG,
            price: 8.5,
            status: ProductStatus.ACTIVE,
            inventory: {
              currentQuantity: 1,
            },
          }]),
        },
        sale: {
          create: jest.fn().mockResolvedValue({
            id: 'sale-1',
            total: 8.5,
            subtotal: 8.5,
            discount: 0,
            amountPaid: 8.5,
            amountPending: 0,
            settlementStatus: SettlementStatus.PAID,
            saleType: 'STANDARD',
            status: SaleStatus.COMPLETED,
            receivable: null,
            cashMovements: [],
            member: {
              id: 'member-1',
              memberNumber: '0001',
              firstName: 'Dani',
              lastName: 'García',
            },
            payments: [
              {
                id: 'payment-1',
                method: PaymentMethod.CASH,
                amount: 8.5,
                status: PaymentStatus.COMPLETED,
              },
            ],
            items: [
              {
                id: 'sale-item-1',
                productId: 'product-1',
                productNameSnapshot: 'Gelato',
                quantity: 0.001,
                unitPrice: 8.5,
                total: 8.5,
                pricingMode: SaleItemPricingMode.BY_WEIGHT,
                requestedAmount: null,
                actualWeight: 0.00102,
                weightDifference: 0.00002,
                wasteQuantity: 0.00002,
                scaleVerified: true,
                scaleToleranceExceeded: false,
              },
            ],
          }),
        },
        cashMovement: {
          create: jest.fn().mockResolvedValue({
            id: 'cash-1',
            amount: 8.5,
            type: CashMovementType.SALE_CASH_IN,
          }),
        },
        inventory: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        inventoryMovement: {
          create: jest
            .fn()
            .mockResolvedValueOnce({
              id: 'movement-sale',
              type: InventoryMovementType.SALE,
            })
            .mockResolvedValueOnce({
              id: 'movement-waste',
              type: InventoryMovementType.WASTE,
            }),
        },
      };

      prisma.$transaction.mockImplementation(
        (callback: (tx: any) => unknown) => callback(tx),
      );

      await service.createSale('tenant-1', 'user-1', ['pos.scale.verify'], {
        memberId: 'member-1',
        cashReceived: 8.5,
        items: [
          {
            productId: 'product-1',
            quantityGrams: 1,
            pricingMode: SaleItemPricingMode.BY_WEIGHT,
            actualWeightGrams: 1.02,
            scaleVerified: true,
          },
        ],
      });

      expect(tx.sale.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: 8.5,
            items: {
              create: [
                expect.objectContaining({
                  quantity: 0.001,
                  actualWeight: 0.00102,
                  weightDifference: 0.00002,
                  wasteQuantity: 0.00002,
                  scaleVerified: true,
                }),
              ],
            },
          }),
        }),
      );

      expect(tx.inventory.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentQuantity: 0.99898,
            totalStockOut: {
              increment: 0.00102,
            },
          }),
        }),
      );

      expect(tx.inventoryMovement.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            type: InventoryMovementType.SALE,
            quantity: -0.001,
            previousQuantity: 1,
            newQuantity: 0.999,
          }),
        }),
      );

      expect(tx.inventoryMovement.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: expect.objectContaining({
            type: InventoryMovementType.WASTE,
            quantity: -0.00002,
            previousQuantity: 0.999,
            newQuantity: 0.99898,
            source: 'scale',
          }),
        }),
      );
    });
  });
});
