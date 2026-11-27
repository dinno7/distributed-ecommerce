import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService, TransactionCtx } from '../../common';
import type {
  CatalogProduct,
  ProductCatalog,
} from '../../common/ports/product-catalog.port';
import type {
  ProductStockReservation,
  StockReservationResult,
} from '../../common/ports/product-stock-reservation.port';
import { Money } from '../../common/value-objects/money';
import { Prisma } from '../../generated/prisma/client.js';
import type { CreateProductDto } from './dto/create-product.dto';
import { Product, ProductType } from './entities/product.entity';
import { ProductErrors } from './product.errors';
import { ProductMapper } from './product.mapper';

@Injectable()
export class ProductService implements ProductCatalog, ProductStockReservation {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto): Promise<Product> {
    const isPhysical = dto.type === ProductType.PHYSICAL;
    if (
      dto.type === ProductType.SUBSCRIPTION &&
      dto.subscriptionDays === undefined
    ) {
      throw ProductErrors.subscriptionDaysRequired();
    }
    if (
      dto.type !== ProductType.SUBSCRIPTION &&
      dto.subscriptionDays !== undefined
    ) {
      throw ProductErrors.subscriptionDaysNotAllowed();
    }
    if (dto.type !== ProductType.DIGITAL && dto.digitalMetadata !== undefined) {
      throw ProductErrors.digitalMetadataNotAllowed();
    }
    if (!isPhysical && dto.initialStock !== undefined) {
      throw ProductErrors.initialStockNotAllowed();
    }

    let unitPrice: Money;
    try {
      unitPrice = new Money(BigInt(dto.unitPriceMinor));
    } catch (error) {
      if (!(error instanceof RangeError || error instanceof SyntaxError))
        throw error;
      throw ProductErrors.invalidUnitPrice(error);
    }

    const row = await this.prisma.product.create({
      data: {
        id: randomUUID(),
        name: dto.name.trim(),
        type: dto.type,
        unitPriceMinor: unitPrice.minorUnits,
        subscriptionDays: dto.subscriptionDays,
        digitalMetadata: dto.digitalMetadata,
        inventory: isPhysical
          ? { create: { available: dto.initialStock ?? 0 } }
          : undefined,
      },
      include: { inventory: true },
    });
    return ProductMapper.toDomain(row, row.inventory?.available);
  }

  async findAll(limit = 25, offset = 0): Promise<Product[]> {
    const rows = await this.prisma.product.findMany({
      orderBy: { id: 'asc' },
      take: limit,
      skip: offset,
    });
    return rows.map((row) => ProductMapper.toDomain(row));
  }

  async findOne(id: string): Promise<Product> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: { inventory: true },
    });
    if (!row) throw ProductErrors.notFound();
    return ProductMapper.toDomain(row, row.inventory?.available);
  }

  async findByIdsTx(
    ids: readonly string[],
    tx: TransactionCtx,
  ): Promise<readonly CatalogProduct[]> {
    const db = tx as Prisma.TransactionClient;
    const rows = await db.product.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        type: true,
        unitPriceMinor: true,
        subscriptionDays: true,
        digitalMetadata: true,
        inventory: { select: { available: true } },
      },
    });

    return rows.map(({ inventory, ...product }) => ({
      ...product,
      availableStock: inventory?.available ?? null,
    }));
  }

  async reserveStock(
    productId: string,
    quantity: number,
    tx: TransactionCtx,
  ): Promise<StockReservationResult> {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 2_147_483_647
    ) {
      throw new RangeError('Reservation requires a positive 32-bit quantity');
    }
    const db = tx as Prisma.TransactionClient;
    const count = await db.$executeRaw`
      UPDATE inventories SET available = available - ${quantity}::integer, updated_at = now()
      WHERE product_id = ${productId}::uuid AND available >= ${quantity}::integer
    `;
    if (count === 1) return 'RESERVED';
    const inventory = await db.inventory.findUnique({
      where: { productId },
      select: { productId: true },
    });
    return inventory ? 'OUT_OF_STOCK' : 'INVENTORY_UNAVAILABLE';
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw ProductErrors.notFound(error);
      }
      throw error;
    }
  }
}
