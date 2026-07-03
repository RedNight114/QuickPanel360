import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProductStatus, UnitType } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productAuditSelect = {
  id: true,
  tenantId: true,
  name: true,
  sku: true,
  barcode: true,
  unitType: true,
  price: true,
  cost: true,
  status: true,
  categoryId: true,
  minimumStock: true,
  idealStock: true,
  allowDecimalQuantity: true,
  trackStock: true,
} satisfies Prisma.ProductSelect;

type ProductForAudit = Prisma.ProductGetPayload<{
  select: typeof productAuditSelect;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(tenantId: string, canViewCost: boolean, take = 500) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        status: {
          not: ProductStatus.ARCHIVED,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        inventory: {
          select: {
            currentQuantity: true,
            minimumQuantity: true,
            maximumQuantity: true,
            reservedQuantity: true,
            lostQuantity: true,
            totalStockIn: true,
            totalStockOut: true,
            lastMovementAt: true,
          },
        },
      },
    });

    if (canViewCost) {
      return products;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return products.map(({ cost, ...product }) => product);
  }

  async findOne(tenantId: string, id: string, canViewCost: boolean) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: ProductStatus.ARCHIVED,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        inventory: {
          select: {
            currentQuantity: true,
            minimumQuantity: true,
            maximumQuantity: true,
            reservedQuantity: true,
            lostQuantity: true,
            totalStockIn: true,
            totalStockOut: true,
            lastMovementAt: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (canViewCost) {
      return product;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cost, ...safeProduct } = product;
    return safeProduct;
  }

  async create(
    tenantId: string,
    userId: string,
    createProductDto: CreateProductDto,
    canViewCost: boolean,
  ) {
    // Metering: check plan product limit
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { maxProducts: true } } },
    });
    if (subscription?.plan?.maxProducts) {
      const currentProducts = await this.prisma.product.count({
        where: { tenantId, status: { not: 'ARCHIVED' } },
      });
      if (currentProducts >= subscription.plan.maxProducts) {
        throw new BadRequestException(
          `El plan actual permite un máximo de ${subscription.plan.maxProducts} productos. Contacta con soporte para ampliar.`,
        );
      }
    }

    if (createProductDto.sku) {
      await this.ensureSkuIsAvailable(tenantId, createProductDto.sku);
    }

    if (createProductDto.categoryId) {
      await this.ensureCategoryBelongsToTenant(
        tenantId,
        createProductDto.categoryId,
      );
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const stockDefaults = this.getStockDefaults(
        createProductDto.unitType,
        createProductDto.minimumStock,
        createProductDto.idealStock,
        createProductDto.allowDecimalQuantity,
      );
      const createdProduct = await tx.product.create({
        data: {
          tenantId,
          categoryId: createProductDto.categoryId,
          name: createProductDto.name,
          description: createProductDto.description,
          sku: createProductDto.sku,
          barcode: createProductDto.barcode,
          unitType: createProductDto.unitType,
          price: createProductDto.price,
          cost: createProductDto.cost,
          imageUrl: createProductDto.imageUrl,
          minimumStock: stockDefaults.minimumStock,
          idealStock: stockDefaults.idealStock,
          allowDecimalQuantity: stockDefaults.allowDecimalQuantity,
          trackStock: createProductDto.trackStock ?? true,
          status: ProductStatus.ACTIVE,
          createdById: userId,
          inventory: {
            create: {
              tenantId,
              currentQuantity: 0,
              minimumQuantity: stockDefaults.minimumStock,
              maximumQuantity: stockDefaults.idealStock,
            },
          },
        },
        include: {
          inventory: true,
          category: true,
        },
      });

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'product.created',
        entityType: 'product',
        entityId: createdProduct.id,
        newValue: this.toProductAuditValue(createdProduct),
      });

      return createdProduct;
    });

    return this.removeCostIfNeeded(product, canViewCost);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    updateProductDto: UpdateProductDto,
    canViewCost: boolean,
  ) {
    const previousProduct = await this.findProductForAudit(tenantId, id);

    if (updateProductDto.sku) {
      await this.ensureSkuIsAvailable(tenantId, updateProductDto.sku, id);
    }

    if (updateProductDto.categoryId) {
      await this.ensureCategoryBelongsToTenant(
        tenantId,
        updateProductDto.categoryId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.product.updateMany({
        where: {
          id,
          tenantId,
          status: {
            not: ProductStatus.ARCHIVED,
          },
        },
        data: {
          categoryId: updateProductDto.categoryId,
          name: updateProductDto.name,
          description: updateProductDto.description,
          sku: updateProductDto.sku,
          barcode: updateProductDto.barcode,
          unitType: updateProductDto.unitType,
          price: updateProductDto.price,
          cost: updateProductDto.cost,
          imageUrl: updateProductDto.imageUrl,
          minimumStock: updateProductDto.minimumStock,
          idealStock: updateProductDto.idealStock,
          allowDecimalQuantity: updateProductDto.allowDecimalQuantity,
          trackStock: updateProductDto.trackStock,
          status: updateProductDto.status,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Producto no encontrado');
      }

      if (
        updateProductDto.minimumStock !== undefined ||
        updateProductDto.idealStock !== undefined
      ) {
        await tx.inventory.updateMany({
          where: {
            tenantId,
            productId: id,
          },
          data: {
            minimumQuantity: updateProductDto.minimumStock,
            maximumQuantity: updateProductDto.idealStock,
          },
        });
      }

      const updatedProduct = await tx.product.findFirst({
        where: {
          id,
          tenantId,
        },
        select: productAuditSelect,
      });

      if (!updatedProduct) {
        throw new NotFoundException('Producto no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'product.updated',
        entityType: 'product',
        entityId: id,
        oldValue: this.toProductAuditValue(previousProduct),
        newValue: this.toProductAuditValue(updatedProduct),
      });

      const product = await tx.product.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          inventory: {
            select: {
              currentQuantity: true,
              minimumQuantity: true,
              maximumQuantity: true,
              reservedQuantity: true,
              lostQuantity: true,
              totalStockIn: true,
              totalStockOut: true,
              lastMovementAt: true,
            },
          },
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      return this.removeCostIfNeeded(product, canViewCost);
    });
  }

  async archive(
    tenantId: string,
    userId: string,
    id: string,
    canViewCost: boolean,
  ) {
    const previousProduct = await this.findProductForAudit(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.product.updateMany({
        where: {
          id,
          tenantId,
          status: {
            not: ProductStatus.ARCHIVED,
          },
        },
        data: {
          status: ProductStatus.ARCHIVED,
        },
      });

      if (updateResult.count !== 1) {
        throw new NotFoundException('Producto no encontrado');
      }

      const product = await tx.product.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          inventory: true,
          category: true,
        },
      });

      if (!product) {
        throw new NotFoundException('Producto no encontrado');
      }

      await this.auditService.createLogWithClient(tx, {
        tenantId,
        userId,
        action: 'product.archived',
        entityType: 'product',
        entityId: id,
        oldValue: {
          status: previousProduct.status,
        },
        newValue: {
          status: product.status,
        },
      });

      return this.removeCostIfNeeded(product, canViewCost);
    });
  }

  private async ensureProductExists(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: ProductStatus.ARCHIVED,
        },
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private async ensureSkuIsAvailable(
    tenantId: string,
    sku: string,
    ignoredProductId?: string,
  ) {
    const existingProduct = await this.prisma.product.findFirst({
      where: {
        tenantId,
        sku,
        id: ignoredProductId
          ? {
              not: ignoredProductId,
            }
          : undefined,
      },
      select: {
        id: true,
      },
    });

    if (existingProduct) {
      throw new ConflictException('Ya existe un producto con ese SKU');
    }
  }

  private async ensureCategoryBelongsToTenant(
    tenantId: string,
    categoryId: string,
  ) {
    const category = await this.prisma.productCategory.findFirst({
      where: {
        id: categoryId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }
  }

  private async findProductForAudit(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        tenantId,
        status: {
          not: ProductStatus.ARCHIVED,
        },
      },
      select: productAuditSelect,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  private removeCostIfNeeded<T extends { cost: unknown }>(
    product: T,
    canViewCost: boolean,
  ) {
    if (canViewCost) {
      return product;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { cost, ...safeProduct } = product;
    return safeProduct;
  }

  private toProductAuditValue(
    product: ProductForAudit,
  ): Prisma.InputJsonObject {
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unitType: product.unitType,
      price: Number(product.price),
      cost: product.cost === null ? null : Number(product.cost),
      status: product.status,
      categoryId: product.categoryId,
      minimumStock:
        product.minimumStock === null ? null : Number(product.minimumStock),
      idealStock:
        product.idealStock === null ? null : Number(product.idealStock),
      allowDecimalQuantity: product.allowDecimalQuantity,
      trackStock: product.trackStock,
    };
  }

  async findAllCategories(tenantId: string) {
    return this.prisma.productCategory.findMany({
      where: { tenantId, status: { not: 'ARCHIVED' } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(
    tenantId: string,
    name: string,
    description?: string,
  ) {
    return this.prisma.productCategory.create({
      data: { tenantId, name, description },
      include: { _count: { select: { products: true } } },
    });
  }

  async updateCategory(
    tenantId: string,
    id: string,
    data: { name?: string; description?: string; status?: string },
  ) {
    return this.prisma.productCategory.update({
      where: { id, tenantId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.status !== undefined
          ? { status: data.status as any }
          : {}),
      },
      include: { _count: { select: { products: true } } },
    });
  }

  async deleteCategory(tenantId: string, id: string) {
    await this.prisma.product.updateMany({
      where: { tenantId, categoryId: id },
      data: { categoryId: null },
    });
    await this.prisma.productCategory.delete({
      where: { id, tenantId },
    });
    return { deleted: true };
  }

  private getStockDefaults(
    unitType: UnitType,
    minimumStock?: number,
    idealStock?: number,
    allowDecimalQuantity?: boolean,
  ) {
    if (unitType === UnitType.KG || unitType === UnitType.GRAM) {
      return {
        minimumStock: minimumStock ?? 5,
        idealStock: idealStock ?? 50,
        allowDecimalQuantity: allowDecimalQuantity ?? true,
      };
    }

    return {
      minimumStock: minimumStock ?? 1,
      idealStock: idealStock ?? 10,
      allowDecimalQuantity: allowDecimalQuantity ?? false,
    };
  }

  async importFromCsv(tenantId: string, userId: string, buffer: Buffer) {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have headers and at least one row');

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const results = { created: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });

      try {
        const name = row.name || row.nombre || row.producto;
        const price = Number(row.price || row.precio || '0');
        const unitTypeRaw = (row.unittype || row.unit || row.tipo || 'UNIT').toUpperCase();
        const validUnitTypes = ['UNIT', 'GRAM', 'KG', 'ML', 'PACK'];
        const unitType = validUnitTypes.includes(unitTypeRaw) ? unitTypeRaw : 'UNIT';

        if (!name) {
          results.errors.push(`Fila ${i + 1}: nombre requerido`);
          continue;
        }
        if (isNaN(price) || price < 0) {
          results.errors.push(`Fila ${i + 1}: precio invalido`);
          continue;
        }

        const data: any = {
          tenantId,
          createdById: userId,
          name,
          price,
          unitType,
        };

        if (row.sku) data.sku = row.sku;
        if (row.barcode || row['codigo barras']) data.barcode = row.barcode || row['codigo barras'];
        if (row.description || row.descripcion) data.description = row.description || row.descripcion;
        if (row.cost || row.coste) data.cost = Number(row.cost || row.coste) || undefined;
        if (row.minimumstock || row['stock minimo']) data.minimumStock = Number(row.minimumstock || row['stock minimo']) || undefined;
        if (row.idealstock || row['stock ideal']) data.idealStock = Number(row.idealstock || row['stock ideal']) || undefined;

        if (row.category || row.categoria) {
          const catName = row.category || row.categoria;
          let category = await this.prisma.productCategory.findFirst({
            where: { tenantId, name: { equals: catName, mode: 'insensitive' } },
          });
          if (!category) {
            category = await this.prisma.productCategory.create({
              data: { tenantId, name: catName },
            });
          }
          data.categoryId = category.id;
        }

        const product = await this.prisma.product.create({ data });

        if (product.trackStock) {
          await this.prisma.inventory.create({
            data: {
              tenantId,
              productId: product.id,
              currentQuantity: 0,
              minimumQuantity: data.minimumStock ?? 0,
            },
          });
        }

        results.created++;
      } catch (error: any) {
        results.errors.push(`Fila ${i + 1}: ${error.message?.slice(0, 80) ?? 'error desconocido'}`);
      }
    }

    return results;
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current); current = ''; continue; }
      current += char;
    }
    values.push(current);
    return values;
  }
}
