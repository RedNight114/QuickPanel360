import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashMovementType,
  InventoryMovementType,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  PosSessionStatus,
  ProductStatus,
  ScaleToleranceAction,
  SaleItemPricingMode,
  SaleType,
  SaleStatus,
  SettlementStatus,
  UnitType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  assertPositiveQuantity,
  eurosToKg,
  gramsToKg,
  kgToEuros,
  kgToGrams,
  roundKg,
  roundMoney,
} from '../common/utils/weight.utils';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import { PrismaService } from '../prisma/prisma.service';
import { MemberDiscountService } from '../members/member-discount.service';
import { CreateSaleItemDto } from './dto/create-sale.dto';
import { ClosePosSessionDto } from './dto/close-pos-session.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { OpenPosSessionDto } from './dto/open-pos-session.dto';

@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly memberDiscountService: MemberDiscountService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async openSession(
    tenantId: string,
    userId: string,
    openPosSessionDto: OpenPosSessionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingOpenSession = await tx.posSession.findFirst({
        where: {
          tenantId,
          openedById: userId,
          status: PosSessionStatus.OPEN,
        },
      });

      if (existingOpenSession) {
        throw new BadRequestException('Ya tienes una caja abierta');
      }

      const session = await tx.posSession.create({
        data: {
          tenantId,
          openedById: userId,
          openingCash: openPosSessionDto.openingCash,
          status: PosSessionStatus.OPEN,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'cash.opened',
        entityType: 'pos_session',
        entityId: session.id,
        newValue: {
          openingCash: Number(session.openingCash),
          status: session.status,
        },
      });

      return session;
    });
  }

  async getCurrentSession(tenantId: string, userId: string) {
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
        sales: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
          select: {
            id: true,
            total: true,
            amountPaid: true,
            amountPending: true,
            settlementStatus: true,
            saleType: true,
            status: true,
            createdAt: true,
            payments: {
              select: {
                method: true,
                amount: true,
              },
            },
          },
        },
        cashMovements: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            type: true,
            amount: true,
            reason: true,
            createdAt: true,
            saleId: true,
          },
        },
      },
    });

    if (!session) {
      return null;
    }

    return {
      ...session,
      cashSummary: this.buildCashSummary(session),
    };
  }

  async closeSession(
    tenantId: string,
    userId: string,
    sessionId: string,
    closePosSessionDto: ClosePosSessionDto,
  ) {
    const closed = await this.prisma.$transaction(async (tx) => {
      const session = await tx.posSession.findFirst({
        where: {
          id: sessionId,
          tenantId,
          openedById: userId,
          status: PosSessionStatus.OPEN,
        },
      });

      if (!session) {
        throw new NotFoundException('Caja abierta no encontrada');
      }

      const cashMovements = await tx.cashMovement.findMany({
        where: {
          tenantId,
          posSessionId: session.id,
        },
        select: {
          type: true,
          amount: true,
        },
      });

      const cashMovementsTotal = this.sumCashMovements(cashMovements);
      const openingCash = Number(session.openingCash);

      const expectedCash = this.roundMoney(openingCash + cashMovementsTotal);
      const closingCash = closePosSessionDto.closingCash;
      const difference = this.roundMoney(closingCash - expectedCash);

      if (difference !== 0) {
        const settings = await tx.tenantSettings.findUnique({
          where: { tenantId },
          select: {
            allowCashDiscrepancyClose: true,
            requireCashDiscrepancyReason: true,
          },
        });

        if (settings?.allowCashDiscrepancyClose === false) {
          throw new BadRequestException(
            'No se permite cerrar la caja con diferencia. El efectivo declarado no coincide con el esperado.',
          );
        }

        if (
          settings?.requireCashDiscrepancyReason &&
          !closePosSessionDto.discrepancyReason?.trim()
        ) {
          throw new BadRequestException(
            'Indica un motivo para la diferencia de caja.',
          );
        }
      }

      const closedSession = await tx.posSession.update({
        where: {
          id: session.id,
        },
        data: {
          closedById: userId,
          closingCash,
          expectedCash,
          difference,
          closingSignature: closePosSessionDto.closingSignature ?? null,
          discrepancyReason: closePosSessionDto.discrepancyReason ?? null,
          status: PosSessionStatus.CLOSED,
          closedAt: new Date(),
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'cash.closed',
        entityType: 'pos_session',
        entityId: closedSession.id,
        oldValue: {
          status: session.status,
          openingCash,
        },
        newValue: {
          openingCash,
          closingCash,
          expectedCash,
          difference,
          cashMovementsTotal,
          status: closedSession.status,
        },
      });

      return closedSession;
    });

    void this.cacheInvalidation.afterCashClose(tenantId);
    return closed;
  }

  async findSales(tenantId: string) {
    return this.prisma.sale.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
        payments: true,
        receivable: true,
        cashMovements: true,
      },
    });
  }

  async findSaleById(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: {
        id: saleId,
        tenantId,
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
        soldBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unitType: true,
              },
            },
          },
        },
        payments: true,
        receivable: true,
        cashMovements: true,
      },
    });

    if (!sale) {
      throw new NotFoundException('Venta no encontrada');
    }

    return sale;
  }

  async createSale(
    tenantId: string,
    userId: string,
    permissions: string[],
    createSaleDto: CreateSaleDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const session = await tx.posSession.findFirst({
        where: {
          tenantId,
          openedById: userId,
          status: PosSessionStatus.OPEN,
        },
      });

      if (!session) {
        throw new BadRequestException(
          'No tienes una caja abierta. Abre caja antes de vender.',
        );
      }

      const member = await tx.member.findFirst({
        where: {
          id: createSaleDto.memberId,
          tenantId,
          status: {
            not: MemberStatus.DELETED,
          },
        },
      });

      if (!member) {
        throw new NotFoundException('Socio no encontrado');
      }

      if (member.status !== MemberStatus.ACTIVE) {
        throw new BadRequestException(
          `El socio no está activo. Estado actual: ${member.status}`,
        );
      }

      const memberLabel = member.memberNumber
        ? `#${member.memberNumber}`
        : `${member.firstName ?? ''}${member.lastName ? ` ${member.lastName}` : ''}`.trim() ||
          'socio sin número';

      const duplicatedProductIds = this.findDuplicatedProductIds(
        createSaleDto.items.map((item) => item.productId),
      );

      if (duplicatedProductIds.length > 0) {
        throw new BadRequestException(
          'No repitas el mismo producto en la venta. Agrupa la cantidad en una sola línea.',
        );
      }

      let subtotal = 0;

      const settings = await tx.tenantSettings.upsert({
        where: { tenantId },
        create: { tenantId },
        update: {},
        select: {
          scaleVerificationEnabled: true,
          requireScaleVerification: true,
          maxWastePerLineGrams: true,
          maxWastePercent: true,
          scaleToleranceAction: true,
          allowUnderWeight: true,
          autoRegisterScaleWaste: true,
          scaleWasteReason: true,
        },
      });

      const saleItemsToCreate: {
        tenantId: string;
        productId: string;
        productNameSnapshot: string;
        quantity: number;
        unitPrice: number;
        total: number;
        pricingMode: SaleItemPricingMode;
        requestedAmount?: number;
        actualWeight?: number;
        weightDifference?: number;
        wasteQuantity?: number;
        scaleVerified?: boolean;
        scaleVerifiedAt?: Date;
        scaleVerifiedById?: string;
        scaleToleranceExceeded?: boolean;
        scaleOverrideReason?: string;
        scaleOverrideById?: string;
      }[] = [];

      const stockUpdates: {
        productId: string;
        productName: string;
        saleQuantity: number;
        stockQuantity: number;
        wasteQuantity: number;
        previousQuantity: number;
        newQuantity: number;
        saleItemId?: string;
      }[] = [];

      // Batch load all products in one query instead of N+1
      const productIds = createSaleDto.items.map((i) => i.productId);
      const allProducts = await tx.product.findMany({
        where: { id: { in: productIds }, tenantId, status: ProductStatus.ACTIVE },
        include: { inventory: true },
      });
      const productMap = new Map(allProducts.map((p) => [p.id, p]));

      for (const item of createSaleDto.items) {
        const product = productMap.get(item.productId);

        if (!product) {
          throw new NotFoundException('Producto no encontrado o no activo');
        }

        if (!product.inventory) {
          throw new BadRequestException(
            `El producto ${product.name} no tiene inventario creado`,
          );
        }

        const normalizedItem = this.normalizeSaleItem(item, {
          unitType: product.unitType,
          price: Number(product.price),
        });
        const currentQuantity = Number(product.inventory.currentQuantity);
        const scaleData = this.resolveScaleData(item, {
          isBulk: product.unitType === UnitType.KG,
          requestedQuantity: normalizedItem.quantity,
          currentQuantity,
          productName: product.name,
          settings: {
            scaleVerificationEnabled: settings.scaleVerificationEnabled,
            requireScaleVerification: settings.requireScaleVerification,
            maxWastePerLineGrams: Number(settings.maxWastePerLineGrams),
            maxWastePercent: Number(settings.maxWastePercent),
            scaleToleranceAction: settings.scaleToleranceAction,
            allowUnderWeight: settings.allowUnderWeight,
          },
          canOverrideScaleTolerance: permissions.includes('pos.scale.override'),
        });
        const stockQuantity =
          scaleData?.actualWeight ?? normalizedItem.quantity;

        if (currentQuantity < stockQuantity) {
          throw new BadRequestException(
            `Stock insuficiente para ${product.name}. Disponible: ${currentQuantity}`,
          );
        }

        const unitPrice = Number(product.price);
        const lineTotal = normalizedItem.total;

        subtotal = roundMoney(subtotal + lineTotal);

        saleItemsToCreate.push({
          tenantId,
          productId: product.id,
          productNameSnapshot: product.name,
          quantity: normalizedItem.quantity,
          unitPrice,
          total: lineTotal,
          pricingMode: normalizedItem.pricingMode,
          requestedAmount: normalizedItem.requestedAmount,
          actualWeight: scaleData?.actualWeight,
          weightDifference: scaleData?.weightDifference,
          wasteQuantity: scaleData?.wasteQuantity,
          scaleVerified: scaleData?.scaleVerified ?? false,
          scaleVerifiedAt: scaleData?.scaleVerified ? new Date() : undefined,
          scaleVerifiedById: scaleData?.scaleVerified ? userId : undefined,
          scaleToleranceExceeded: scaleData?.scaleToleranceExceeded ?? false,
          scaleOverrideReason: item.scaleOverrideReason?.trim() || undefined,
          scaleOverrideById: scaleData?.scaleOverridden ? userId : undefined,
        });

        stockUpdates.push({
          productId: product.id,
          productName: product.name,
          saleQuantity: normalizedItem.quantity,
          stockQuantity,
          wasteQuantity: scaleData?.wasteQuantity ?? 0,
          previousQuantity: currentQuantity,
          newQuantity: roundKg(currentQuantity - stockQuantity),
        });
      }

      const discount = createSaleDto.discount ?? 0;

      if (discount > subtotal) {
        throw new BadRequestException(
          'El descuento no puede ser mayor que el subtotal',
        );
      }

      const total = roundMoney(subtotal - discount);

      if (
        createSaleDto.payments?.some(
          (payment) => payment.method !== PaymentMethod.CASH,
        )
      ) {
        throw new BadRequestException(
          'En este TPV solo se permite cobro en efectivo',
        );
      }

      const legacyPaymentsAmount =
        createSaleDto.payments?.reduce(
          (sum, payment) => sum + payment.amount,
          0,
        ) ?? undefined;
      const cashReceived = roundMoney(
        createSaleDto.cashReceived ??
          createSaleDto.amountPaid ??
          legacyPaymentsAmount ??
          total,
      );

      if (cashReceived < 0) {
        throw new BadRequestException(
          'El efectivo recibido no puede ser negativo',
        );
      }

      const amountPaid = roundMoney(Math.min(cashReceived, total));
      const changeDue = roundMoney(Math.max(cashReceived - total, 0));
      const amountPending = roundMoney(Math.max(total - cashReceived, 0));
      const settlementStatus = this.getSettlementStatus(amountPaid, total);
      const saleType = this.getSaleType(amountPaid, total);

      if (amountPaid < 0 || amountPaid > total) {
        throw new BadRequestException(
          'El importe cobrado debe estar entre 0 y el total de la venta',
        );
      }

      if (amountPending > 0 && !createSaleDto.creditReason?.trim()) {
        throw new BadRequestException(
          'Debes indicar un motivo para dejar importe pendiente.',
        );
      }

      const sale = await tx.sale.create({
        data: {
          tenantId,
          memberId: member.id,
          posSessionId: session.id,
          soldById: userId,
          subtotal,
          discount,
          total,
          amountPaid,
          amountPending,
          settlementStatus,
          saleType,
          creditReason: createSaleDto.creditReason?.trim(),
          status: SaleStatus.COMPLETED,
          items: {
            create: saleItemsToCreate,
          },
          ...(amountPaid > 0
            ? {
                payments: {
                  create: {
                    tenantId,
                    method: PaymentMethod.CASH,
                    amount: amountPaid,
                    status: PaymentStatus.COMPLETED,
                  },
                },
              }
            : {}),
          ...(amountPending > 0
            ? {
                receivable: {
                  create: {
                    tenantId,
                    memberId: member.id,
                    originalAmount: amountPending,
                    paidAmount: 0,
                    outstandingAmount: amountPending,
                    reason: createSaleDto.creditReason?.trim(),
                    dueDate: createSaleDto.dueDate
                      ? new Date(createSaleDto.dueDate)
                      : undefined,
                    createdById: userId,
                  },
                },
              }
            : {}),
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
          items: true,
          payments: true,
          receivable: true,
          cashMovements: true,
        },
      });

      for (const stockUpdate of stockUpdates) {
        stockUpdate.saleItemId = sale.items.find(
          (item) => item.productId === stockUpdate.productId,
        )?.id;
      }

      let cashMovement: {
        id: string;
        amount: unknown;
        type: CashMovementType;
      } | null = null;

      if (amountPaid > 0) {
        cashMovement = await tx.cashMovement.create({
          data: {
            tenantId,
            posSessionId: session.id,
            saleId: sale.id,
            type: CashMovementType.SALE_CASH_IN,
            amount: amountPaid,
            reason: `Aportación en efectivo de ${memberLabel}`,
            createdById: userId,
          },
          select: {
            id: true,
            amount: true,
            type: true,
          },
        });
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: amountPending > 0 ? 'sale.credit_created' : 'sale.cash_created',
        entityType: 'sale',
        entityId: sale.id,
        newValue: {
          memberId: member.id,
          posSessionId: session.id,
          subtotal,
          discount,
          total,
          cashReceived,
          amountPaid,
          amountPending,
          changeDue,
          settlementStatus,
          saleType,
          creditReason: createSaleDto.creditReason?.trim(),
          items: sale.items.map((item) => ({
            productId: item.productId,
            productNameSnapshot: item.productNameSnapshot,
            quantity: Number(item.quantity),
            quantityGrams: kgToGrams(Number(item.quantity)),
            unitPrice: Number(item.unitPrice),
            total: Number(item.total),
            pricingMode: item.pricingMode,
            requestedAmount:
              item.requestedAmount === null
                ? null
                : Number(item.requestedAmount),
            actualWeight:
              item.actualWeight === null ? null : Number(item.actualWeight),
            actualWeightGrams:
              item.actualWeight === null
                ? null
                : kgToGrams(Number(item.actualWeight)),
            weightDifference:
              item.weightDifference === null
                ? null
                : Number(item.weightDifference),
            weightDifferenceGrams:
              item.weightDifference === null
                ? null
                : kgToGrams(Number(item.weightDifference)),
            wasteQuantity:
              item.wasteQuantity === null ? null : Number(item.wasteQuantity),
            wasteQuantityGrams:
              item.wasteQuantity === null
                ? null
                : kgToGrams(Number(item.wasteQuantity)),
            scaleVerified: item.scaleVerified,
            scaleToleranceExceeded: item.scaleToleranceExceeded,
            scaleOverrideReason: item.scaleOverrideReason ?? null,
            scaleOverrideById: item.scaleOverrideById ?? null,
          })),
          payments: sale.payments.map((payment) => ({
            method: payment.method,
            amount: Number(payment.amount),
            status: payment.status,
          })),
          receivable: sale.receivable
            ? {
                id: sale.receivable.id,
                outstandingAmount: Number(sale.receivable.outstandingAmount),
                status: sale.receivable.status,
              }
            : null,
          cashMovement: cashMovement
            ? {
                id: cashMovement.id,
                amount: Number(cashMovement.amount),
                type: cashMovement.type,
              }
            : null,
        },
      });

      if (cashMovement) {
        await this.auditService.createLogWithClient(tx, {
          tenantId,
          userId,
          action: 'cash.movement_created',
          entityType: 'cash_movement',
          entityId: cashMovement.id,
          newValue: {
            type: cashMovement.type,
            amount: Number(cashMovement.amount),
            reason: `Aportación en efectivo de ${memberLabel}`,
            posSessionId: session.id,
          },
        });
      }

      if (sale.receivable) {
        await this.auditService.createLogWithClient(tx, {
          tenantId,
          userId,
          action: 'receivable.created',
          entityType: 'receivable',
          entityId: sale.receivable.id,
          newValue: {
            memberId: member.id,
            saleId: sale.id,
            originalAmount: Number(sale.receivable.originalAmount),
            outstandingAmount: Number(sale.receivable.outstandingAmount),
            reason: sale.receivable.reason,
          },
        });
      }

      const sortedUpdates = [...stockUpdates].sort((a, b) =>
        a.productId.localeCompare(b.productId),
      );
      for (const stockUpdate of sortedUpdates) {
        await tx.inventory.updateMany({
          where: { tenantId, productId: stockUpdate.productId },
          data: {
            currentQuantity: stockUpdate.newQuantity,
            totalStockOut: { increment: stockUpdate.stockQuantity },
            lastMovementAt: new Date(),
          },
        });
      }

      for (const stockUpdate of stockUpdates) {
        const movement = await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: stockUpdate.productId,
            type: InventoryMovementType.SALE,
            quantity: -stockUpdate.saleQuantity,
            previousQuantity: stockUpdate.previousQuantity,
            newQuantity: roundKg(
              stockUpdate.previousQuantity - stockUpdate.saleQuantity,
            ),
            reason: `Dispensación a ${memberLabel}`,
            source: 'sale',
            referenceType: 'sale_item',
            referenceId: stockUpdate.saleItemId ?? sale.id,
            createdById: userId,
          },
        });

        await this.auditService.createLogWithClient(tx, {
          tenantId,
          userId,
          action: 'stock.sold',
          entityType: 'inventory_movement',
          entityId: movement.id,
          oldValue: {
            productId: stockUpdate.productId,
            previousQuantity: stockUpdate.previousQuantity,
          },
          newValue: {
            saleId: sale.id,
            saleItemId: stockUpdate.saleItemId,
            productId: stockUpdate.productId,
            productName: stockUpdate.productName,
            quantitySold: stockUpdate.saleQuantity,
            quantitySoldGrams: kgToGrams(stockUpdate.saleQuantity),
            stockQuantity: stockUpdate.stockQuantity,
            stockQuantityGrams: kgToGrams(stockUpdate.stockQuantity),
            newQuantity: roundKg(
              stockUpdate.previousQuantity - stockUpdate.saleQuantity,
            ),
          },
        });

        if (stockUpdate.wasteQuantity > 0 && settings.autoRegisterScaleWaste) {
          const wasteMovement = await tx.inventoryMovement.create({
            data: {
              tenantId,
              productId: stockUpdate.productId,
              type: InventoryMovementType.WASTE,
              quantity: -stockUpdate.wasteQuantity,
              previousQuantity: roundKg(
                stockUpdate.previousQuantity - stockUpdate.saleQuantity,
              ),
              newQuantity: stockUpdate.newQuantity,
              reason:
                settings.scaleWasteReason ??
                `Merma báscula en dispensación a ${memberLabel}`,
              source: 'scale',
              referenceType: 'sale_item',
              referenceId: stockUpdate.saleItemId ?? sale.id,
              createdById: userId,
            },
          });

          await this.auditService.createLogWithClient(tx, {
            tenantId,
            userId,
            action: 'stock.wasted',
            entityType: 'inventory_movement',
            entityId: wasteMovement.id,
            oldValue: {
              productId: stockUpdate.productId,
              previousQuantity: roundKg(
                stockUpdate.previousQuantity - stockUpdate.saleQuantity,
              ),
            },
            newValue: {
              saleId: sale.id,
              saleItemId: stockUpdate.saleItemId,
              productId: stockUpdate.productId,
              productName: stockUpdate.productName,
              reason:
                settings.scaleWasteReason ??
                `Merma báscula en dispensación a ${memberLabel}`,
              quantityLost: stockUpdate.wasteQuantity,
              quantityLostGrams: kgToGrams(stockUpdate.wasteQuantity),
              newQuantity: stockUpdate.newQuantity,
              source: 'scale',
            },
          });
        }
      }

      return {
        ...sale,
        changeDue,
        amountPaid,
        amountPending,
        receivable: sale.receivable,
      };
    });

    void this.cacheInvalidation.afterSale(tenantId);
    return result;
  }

  async cancelSale(
    tenantId: string,
    userId: string,
    saleId: string,
    reason: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenantId },
        include: {
          items: { select: { productId: true, quantity: true } },
          cashMovements: { select: { id: true, amount: true, type: true } },
          receivable: { select: { id: true, status: true } },
        },
      });

      if (!sale) {
        throw new NotFoundException('Dispensación no encontrada');
      }

      if (sale.status === SaleStatus.CANCELLED) {
        throw new BadRequestException('Esta dispensación ya fue cancelada');
      }

      if (sale.status === SaleStatus.REFUNDED) {
        throw new BadRequestException('Esta dispensación ya fue devuelta');
      }

      await tx.sale.update({
        where: { id: saleId },
        data: {
          status: SaleStatus.CANCELLED,
          cancelledById: userId,
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });

      for (const item of sale.items) {
        await tx.inventory.updateMany({
          where: { tenantId, productId: item.productId },
          data: { currentQuantity: { increment: Number(item.quantity) } },
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId,
            productId: item.productId,
            type: InventoryMovementType.RETURN,
            quantity: Number(item.quantity),
            previousQuantity: 0,
            newQuantity: 0,
            reason: `Devolución por cancelación de dispensación`,
            referenceType: 'sale',
            referenceId: saleId,
            createdById: userId,
          },
        });
      }

      if (sale.receivable && sale.receivable.status !== 'CANCELLED') {
        await tx.receivable.update({
          where: { id: sale.receivable.id },
          data: { status: 'CANCELLED' },
        });
      }

      for (const movement of sale.cashMovements) {
        if (movement.type === CashMovementType.SALE_CASH_IN) {
          await tx.cashMovement.create({
            data: {
              tenantId,
              posSessionId: sale.posSessionId,
              saleId,
              type: CashMovementType.CORRECTION_OUT,
              amount: Number(movement.amount),
              reason: `Corrección por cancelación de dispensación`,
              createdById: userId,
            },
          });
        }
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'sale.cancelled',
        entityType: 'sale',
        entityId: saleId,
        oldValue: { status: sale.status },
        newValue: { status: SaleStatus.CANCELLED, reason },
      });

      return { ok: true, saleId };
    });

    void this.cacheInvalidation.afterSale(tenantId);
  }

  private findDuplicatedProductIds(productIds: string[]) {
    const seen = new Set<string>();
    const duplicated = new Set<string>();

    for (const productId of productIds) {
      if (seen.has(productId)) {
        duplicated.add(productId);
      }

      seen.add(productId);
    }

    return Array.from(duplicated);
  }

  private roundMoney(value: number) {
    return roundMoney(value);
  }

  private roundQuantity(value: number) {
    return roundKg(value);
  }

  private resolveScaleData(
    item: CreateSaleItemDto,
    context: {
      isBulk: boolean;
      requestedQuantity: number;
      currentQuantity: number;
      productName: string;
      settings: {
        scaleVerificationEnabled: boolean;
        requireScaleVerification: boolean;
        maxWastePerLineGrams: number;
        maxWastePercent: number;
        scaleToleranceAction: ScaleToleranceAction;
        allowUnderWeight: boolean;
      };
      canOverrideScaleTolerance: boolean;
    },
  ) {
    if (!context.isBulk || !context.settings.scaleVerificationEnabled) {
      return null;
    }

    const actualWeight =
      item.actualWeightKg !== undefined
        ? item.actualWeightKg
        : item.actualWeightGrams !== undefined
          ? gramsToKg(item.actualWeightGrams)
          : undefined;

    if (actualWeight === undefined) {
      if (context.settings.requireScaleVerification) {
        throw new BadRequestException(
          `Introduce el peso real en báscula para ${context.productName}.`,
        );
      }

      return null;
    }

    assertPositiveQuantity(actualWeight, 'peso real');

    if (!item.scaleVerified) {
      throw new BadRequestException(
        `Confirma la verificación de báscula para ${context.productName}.`,
      );
    }

    const requestedQuantity = roundKg(context.requestedQuantity);
    const roundedActualWeight = roundKg(actualWeight);
    const weightDifference = roundKg(roundedActualWeight - requestedQuantity);

    if (roundedActualWeight > context.currentQuantity) {
      throw new BadRequestException(
        `Stock insuficiente para ${context.productName}. Disponible: ${context.currentQuantity}`,
      );
    }

    if (weightDifference < 0 && !context.settings.allowUnderWeight) {
      throw new BadRequestException(
        `El peso real de ${context.productName} es inferior a lo solicitado.`,
      );
    }

    const wasteQuantity = Math.max(weightDifference, 0);
    const maxWasteByGrams = gramsToKg(context.settings.maxWastePerLineGrams);
    const maxWasteByPercent = roundKg(
      requestedQuantity * (context.settings.maxWastePercent / 100),
    );
    const maxAllowedWaste = Math.max(maxWasteByGrams, maxWasteByPercent);
    const scaleToleranceExceeded = wasteQuantity > maxAllowedWaste;

    if (scaleToleranceExceeded) {
      if (
        context.settings.scaleToleranceAction === ScaleToleranceAction.BLOCK
      ) {
        throw new BadRequestException(
          `La merma de ${context.productName} supera la tolerancia configurada.`,
        );
      }

      if (
        context.settings.scaleToleranceAction ===
        ScaleToleranceAction.REQUIRE_MANAGER_CONFIRMATION
      ) {
        if (!context.canOverrideScaleTolerance) {
          throw new BadRequestException(
            `La merma de ${context.productName} requiere autorización de manager.`,
          );
        }

        if (!item.scaleOverrideReason?.trim()) {
          throw new BadRequestException(
            `Indica un motivo de autorización para la merma de ${context.productName}.`,
          );
        }
      }
    }

    return {
      actualWeight: roundedActualWeight,
      weightDifference,
      wasteQuantity: roundKg(wasteQuantity),
      scaleVerified: true,
      scaleToleranceExceeded,
      scaleOverridden:
        scaleToleranceExceeded &&
        context.settings.scaleToleranceAction ===
          ScaleToleranceAction.REQUIRE_MANAGER_CONFIRMATION,
    };
  }

  private normalizeSaleItem(
    item: CreateSaleItemDto,
    product: { unitType: UnitType; price: number },
  ) {
    if (product.unitType === UnitType.KG) {
      if (item.amountEuros !== undefined) {
        assertPositiveQuantity(item.amountEuros, 'importe');
        const quantity = eurosToKg(item.amountEuros, product.price);

        return {
          quantity,
          total: roundMoney(item.amountEuros),
          pricingMode: SaleItemPricingMode.BY_AMOUNT,
          requestedAmount: roundMoney(item.amountEuros),
        };
      }

      const quantity =
        item.quantityKg !== undefined
          ? item.quantityKg
          : item.quantityGrams !== undefined
            ? gramsToKg(item.quantityGrams)
            : item.quantity;

      assertPositiveQuantity(quantity ?? 0);

      return {
        quantity: roundKg(quantity ?? 0),
        total: kgToEuros(quantity ?? 0, product.price),
        pricingMode: SaleItemPricingMode.BY_WEIGHT,
        requestedAmount: undefined,
      };
    }

    const quantity = item.quantityUnits ?? item.quantity;
    assertPositiveQuantity(quantity ?? 0);

    return {
      quantity: this.roundQuantity(quantity ?? 0),
      total: roundMoney(product.price * (quantity ?? 0)),
      pricingMode: SaleItemPricingMode.BY_UNIT,
      requestedAmount: undefined,
    };
  }

  private getSettlementStatus(amountPaid: number, total: number) {
    if (amountPaid <= 0) {
      return SettlementStatus.PENDING;
    }

    if (amountPaid < total) {
      return SettlementStatus.PARTIALLY_PAID;
    }

    return SettlementStatus.PAID;
  }

  private getSaleType(amountPaid: number, total: number) {
    if (amountPaid <= 0) {
      return SaleType.CREDIT;
    }

    if (amountPaid < total) {
      return SaleType.PARTIAL_CREDIT;
    }

    return SaleType.STANDARD;
  }

  private buildCashSummary(session: {
    openingCash: unknown;
    sales?: {
      total: unknown;
      amountPending?: unknown;
      status: SaleStatus;
    }[];
    cashMovements?: {
      type: CashMovementType;
      amount: unknown;
    }[];
  }) {
    const movements = session.cashMovements ?? [];
    const sales =
      session.sales?.filter((sale) => sale.status !== SaleStatus.CANCELLED) ??
      [];
    const salesCashIn = movements
      .filter((movement) => movement.type === CashMovementType.SALE_CASH_IN)
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
    const receivableCashIn = movements
      .filter(
        (movement) => movement.type === CashMovementType.RECEIVABLE_CASH_IN,
      )
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
    const negativeTypes = new Set<CashMovementType>([
      CashMovementType.THIRD_PARTY_CASH_OUT,
      CashMovementType.WITHDRAWAL,
      CashMovementType.CASH_OUT,
      CashMovementType.EXPENSE,
      CashMovementType.CORRECTION_OUT,
    ]);
    const cashOut = movements
      .filter((movement) => negativeTypes.has(movement.type))
      .reduce((sum, movement) => sum + Number(movement.amount), 0);
    const cashMovementsTotal = this.sumCashMovements(movements);
    const openingCash = Number(session.openingCash);
    const salesTotal = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
    const amountPendingTotal = sales.reduce(
      (sum, sale) => sum + Number(sale.amountPending ?? 0),
      0,
    );

    return {
      openingCash: this.roundMoney(openingCash),
      salesCashIn: this.roundMoney(salesCashIn),
      receivableCashIn: this.roundMoney(receivableCashIn),
      cashOut: this.roundMoney(cashOut),
      expectedCash: this.roundMoney(openingCash + cashMovementsTotal),
      salesTotal: this.roundMoney(salesTotal),
      amountPendingTotal: this.roundMoney(amountPendingTotal),
      operationsCount: sales.length,
    };
  }

  private sumCashMovements(
    movements: {
      type: CashMovementType;
      amount: unknown;
    }[],
  ) {
    const positiveTypes = new Set<CashMovementType>([
      CashMovementType.SALE_CASH_IN,
      CashMovementType.RECEIVABLE_CASH_IN,
      CashMovementType.CASH_IN,
      CashMovementType.CORRECTION_IN,
    ]);
    const negativeTypes = new Set<CashMovementType>([
      CashMovementType.THIRD_PARTY_CASH_OUT,
      CashMovementType.WITHDRAWAL,
      CashMovementType.CASH_OUT,
      CashMovementType.EXPENSE,
      CashMovementType.CORRECTION_OUT,
    ]);

    return movements.reduce((sum, movement) => {
      const amount = Number(movement.amount);

      if (negativeTypes.has(movement.type)) {
        return sum - amount;
      }

      if (positiveTypes.has(movement.type)) {
        return sum + amount;
      }

      return sum;
    }, 0);
  }

  async getMemberSuggestedDiscounts(tenantId: string, memberId: string) {
    return this.memberDiscountService.calculateMemberDiscounts(
      tenantId,
      memberId,
    );
  }
}
