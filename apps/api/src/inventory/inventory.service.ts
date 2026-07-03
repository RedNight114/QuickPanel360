import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryMovementType, ProductStatus, UnitType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { CacheInvalidationService } from '../cache/cache-invalidation.service';
import {
  assertPositiveQuantity,
  gramsToKg,
  roundKg,
} from '../common/utils/weight.utils';
import { PrismaService } from '../prisma/prisma.service';
import { AddStockDto } from './dto/add-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { WasteStockDto } from './dto/waste-stock.dto';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cacheInvalidation: CacheInvalidationService,
  ) {}

  async findAll(tenantId: string, canViewCost = false, take = 500) {
    const inventory = await this.prisma.inventory.findMany({
      where: {
        tenantId,
        product: {
          status: {
            not: ProductStatus.ARCHIVED,
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
      take,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unitType: true,
            price: true,
            cost: true,
            status: true,
            imageUrl: true,
            minimumStock: true,
            idealStock: true,
            allowDecimalQuantity: true,
            trackStock: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return inventory.map((item) => {
      const itemWithStatus = {
        ...item,
        stockStatus: this.getStockStatus(
          Number(item.currentQuantity),
          Number(item.minimumQuantity),
        ),
      };

      if (canViewCost) {
        return itemWithStatus;
      }

      return {
        ...itemWithStatus,
        product: itemWithStatus.product
          ? {
              ...itemWithStatus.product,
              cost: null,
            }
          : itemWithStatus.product,
      };
    });
  }

  async findMovements(tenantId: string) {
    return this.prisma.inventoryMovement.findMany({
      where: {
        tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
      include: {
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

  async addStock(
    tenantId: string,
    userId: string,
    productId: string,
    addStockDto: AddStockDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await this.ensureProductBelongsToTenant(
        tenantId,
        productId,
        tx,
      );
      const inventory = await this.ensureInventory(tenantId, productId, tx);
      const quantity = this.normalizeStockQuantity(product.unitType, {
        quantity: addStockDto.quantity,
        quantityKg: addStockDto.quantityKg,
        quantityGrams: addStockDto.quantityGrams,
      });
      const previousQuantity = Number(inventory.currentQuantity);
      const newQuantity = roundKg(previousQuantity + quantity);
      const totalCost =
        addStockDto.unitCost === undefined
          ? undefined
          : addStockDto.unitCost * quantity;
      const reason = addStockDto.reason ?? 'Entrada de stock';
      const now = new Date();

      const updatedInventory = await tx.inventory.update({
        where: {
          productId,
        },
        data: {
          currentQuantity: newQuantity,
          totalStockIn: {
            increment: quantity,
          },
          lastMovementAt: now,
        },
        include: this.inventoryInclude(),
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId,
          type: InventoryMovementType.STOCK_IN,
          quantity,
          previousQuantity,
          newQuantity,
          unitCost: addStockDto.unitCost,
          totalCost,
          reason,
          notes: addStockDto.notes,
          batchCode: addStockDto.batchCode,
          source: 'manual',
          referenceType: 'manual_stock_add',
          createdById: userId,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'stock.added',
        entityType: 'inventory_movement',
        entityId: movement.id,
        oldValue: {
          productId,
          productName: product.name,
          quantity: previousQuantity,
        },
        newValue: {
          productId,
          productName: product.name,
          unitType: product.unitType,
          quantityAdded: quantity,
          quantity: newQuantity,
          reason,
          notes: addStockDto.notes,
          unitCost: addStockDto.unitCost,
          totalCost,
          batchCode: addStockDto.batchCode,
        },
      });

      return this.withStockStatus(updatedInventory);
    });

    void this.cacheInvalidation.afterInventoryChange(tenantId);
    return result;
  }

  async adjustStock(
    tenantId: string,
    userId: string,
    productId: string,
    adjustStockDto: AdjustStockDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await this.ensureProductBelongsToTenant(
        tenantId,
        productId,
        tx,
      );
      const inventory = await this.ensureInventory(tenantId, productId, tx);
      const previousQuantity = Number(inventory.currentQuantity);
      const newQuantity = this.normalizeStockQuantity(product.unitType, {
        quantity: adjustStockDto.newQuantity,
        quantityKg: adjustStockDto.newQuantityKg,
        quantityGrams: adjustStockDto.newQuantityGrams,
        allowZero: true,
      });
      const difference = roundKg(newQuantity - previousQuantity);
      const now = new Date();

      const updatedInventory = await tx.inventory.update({
        where: {
          productId,
        },
        data: {
          currentQuantity: newQuantity,
          totalStockOut:
            difference < 0
              ? {
                  increment: Math.abs(difference),
                }
              : undefined,
          totalStockIn:
            difference > 0
              ? {
                  increment: difference,
                }
              : undefined,
          lastMovementAt: now,
        },
        include: this.inventoryInclude(),
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId,
          type: InventoryMovementType.ADJUSTMENT,
          quantity: difference,
          previousQuantity,
          newQuantity,
          reason: adjustStockDto.reason,
          notes: adjustStockDto.notes,
          source: 'adjustment',
          referenceType: 'manual_stock_adjustment',
          createdById: userId,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'stock.adjusted',
        entityType: 'inventory_movement',
        entityId: movement.id,
        oldValue: {
          productId,
          productName: product.name,
          quantity: previousQuantity,
        },
        newValue: {
          productId,
          productName: product.name,
          unitType: product.unitType,
          difference,
          quantity: newQuantity,
          reason: movement.reason,
          notes: movement.notes,
        },
      });

      return this.withStockStatus(updatedInventory);
    });

    void this.cacheInvalidation.afterInventoryChange(tenantId);
    return result;
  }

  async wasteStock(
    tenantId: string,
    userId: string,
    productId: string,
    wasteStockDto: WasteStockDto,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      const product = await this.ensureProductBelongsToTenant(
        tenantId,
        productId,
        tx,
      );
      const inventory = await this.ensureInventory(tenantId, productId, tx);
      const quantity = this.normalizeStockQuantity(product.unitType, {
        quantity: wasteStockDto.quantity,
        quantityKg: wasteStockDto.quantityKg,
        quantityGrams: wasteStockDto.quantityGrams,
      });
      const previousQuantity = Number(inventory.currentQuantity);

      if (quantity > previousQuantity) {
        throw new BadRequestException(
          'No hay stock suficiente para registrar esta merma.',
        );
      }

      const newQuantity = roundKg(previousQuantity - quantity);
      const now = new Date();

      const updatedInventory = await tx.inventory.update({
        where: {
          productId,
        },
        data: {
          currentQuantity: newQuantity,
          lostQuantity: {
            increment: quantity,
          },
          totalStockOut: {
            increment: quantity,
          },
          lastMovementAt: now,
        },
        include: this.inventoryInclude(),
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          tenantId,
          productId,
          type: InventoryMovementType.WASTE,
          quantity: -quantity,
          previousQuantity,
          newQuantity,
          reason: wasteStockDto.reason,
          notes: wasteStockDto.notes,
          source: 'waste',
          referenceType: 'waste',
          createdById: userId,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'stock.waste_registered',
        entityType: 'inventory_movement',
        entityId: movement.id,
        oldValue: {
          productId,
          productName: product.name,
          quantity: previousQuantity,
        },
        newValue: {
          productId,
          productName: product.name,
          unitType: product.unitType,
          quantityWasted: quantity,
          quantity: newQuantity,
          reason: wasteStockDto.reason,
          notes: wasteStockDto.notes,
        },
      });

      return this.withStockStatus(updatedInventory);
    });

    void this.cacheInvalidation.afterInventoryChange(tenantId);
    return result;
  }

  private async ensureInventory(
    tenantId: string,
    productId: string,
    prisma: PrismaService | Prisma.TransactionClient,
  ) {
    return (
      (await prisma.inventory.findFirst({
        where: {
          tenantId,
          productId,
        },
      })) ??
      (await prisma.inventory.create({
        data: {
          tenantId,
          productId,
          currentQuantity: 0,
          minimumQuantity: 0,
        },
      }))
    );
  }

  private async ensureProductBelongsToTenant(
    tenantId: string,
    productId: string,
    prisma: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        status: {
          not: ProductStatus.ARCHIVED,
        },
      },
      select: {
        id: true,
        name: true,
        unitType: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private inventoryInclude() {
    return {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          unitType: true,
          price: true,
          cost: true,
          status: true,
          imageUrl: true,
          minimumStock: true,
          idealStock: true,
          allowDecimalQuantity: true,
          trackStock: true,
        },
      },
    } satisfies Prisma.InventoryInclude;
  }

  private withStockStatus<
    T extends { currentQuantity: unknown; minimumQuantity: unknown },
  >(inventory: T) {
    return {
      ...inventory,
      stockStatus: this.getStockStatus(
        Number(inventory.currentQuantity),
        Number(inventory.minimumQuantity),
      ),
    };
  }

  private getStockStatus(currentQuantity: number, minimumQuantity: number) {
    if (currentQuantity <= 0) {
      return 'OUT_OF_STOCK';
    }

    if (currentQuantity <= minimumQuantity) {
      return 'LOW_STOCK';
    }

    return 'OK';
  }

  private normalizeStockQuantity(
    unitType: UnitType,
    input: {
      quantity?: number;
      quantityKg?: number;
      quantityGrams?: number;
      allowZero?: boolean;
    },
  ) {
    const rawQuantity =
      unitType === UnitType.KG
        ? (input.quantityKg ??
          (input.quantityGrams === undefined
            ? undefined
            : gramsToKg(input.quantityGrams)) ??
          input.quantity)
        : input.quantity;

    if (input.allowZero && rawQuantity === 0) {
      return 0;
    }

    assertPositiveQuantity(rawQuantity ?? 0);
    return roundKg(rawQuantity ?? 0);
  }
}
