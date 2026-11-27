import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../common';
import { Prisma } from '../../generated/prisma/client.js';
import { Product, ProductType } from './entities/product.entity';
import { ProductService } from './product.service';

describe('ProductService', () => {
  const product = {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  };
  const row = {
    id: '019338a0-0000-7000-8000-000000000001',
    name: 'Keyboard',
    type: ProductType.PHYSICAL,
    unitPriceMinor: 9_007_199_254_740_993n,
    subscriptionDays: null,
    digitalMetadata: null,
    inventory: { available: 3 },
  };
  let service: ProductService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: { product } },
      ],
    }).compile();
    service = module.get(ProductService);
  });

  it('creates physical inventory in the product write and maps the result', async () => {
    product.create.mockResolvedValue(row);
    const result = await service.create({
      name: row.name,
      type: row.type,
      unitPriceMinor: row.unitPriceMinor.toString(),
      initialStock: 3,
    });

    expect(product.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitPriceMinor: row.unitPriceMinor,
        inventory: { create: { available: 3 } },
      }),
      include: { inventory: true },
    });
    expect(result).toBeInstanceOf(Product);
    expect(result.unitPrice.minorUnits).toBe(row.unitPriceMinor);
    expect(result.availableStock).toBe(3);
  });

  it.each([
    [{ type: ProductType.SUBSCRIPTION }, 'PRODUCT_SUBSCRIPTION_DAYS_REQUIRED'],
    [{ subscriptionDays: 30 }, 'PRODUCT_SUBSCRIPTION_DAYS_NOT_ALLOWED'],
    [{ digitalMetadata: {} }, 'PRODUCT_DIGITAL_METADATA_NOT_ALLOWED'],
    [
      { type: ProductType.DIGITAL, initialStock: 1 },
      'PRODUCT_INITIAL_STOCK_NOT_ALLOWED',
    ],
    [{ unitPriceMinor: '9223372036854775808' }, 'PRODUCT_INVALID_UNIT_PRICE'],
    [{ unitPriceMinor: 'invalid' }, 'PRODUCT_INVALID_UNIT_PRICE'],
  ] as const)(
    'rejects invalid input %j before writing with %s',
    async (input, errorCode) => {
      const result = service.create({
        name: row.name,
        type: row.type,
        unitPriceMinor: '1',
        ...input,
      });

      await expect(result).rejects.toBeInstanceOf(BadRequestException);
      await expect(result).rejects.toHaveProperty(
        'response.errorCode',
        errorCode,
      );
      expect(product.create).not.toHaveBeenCalled();
    },
  );

  it('paginates the catalog and maps its rows', async () => {
    product.findMany.mockResolvedValue([row]);

    const [result] = await service.findAll(10, 20);

    expect(product.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
      take: 10,
      skip: 20,
    });
    expect(result.unitPrice.minorUnits).toBe(row.unitPriceMinor);
    expect(result.availableStock).toBeUndefined();
  });

  it('reports a missing product', async () => {
    product.findUnique.mockResolvedValue(null);
    const result = service.findOne(row.id);
    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toHaveProperty('response', {
      statusCode: 404,
      message: 'Product not found',
      error: 'Not Found',
      errorCode: 'PRODUCT_NOT_FOUND',
    });
  });

  it('deletes by UUID in one operation', async () => {
    await service.remove(row.id);
    expect(product.delete).toHaveBeenCalledWith({ where: { id: row.id } });
  });

  it('reports the same missing product error on delete', async () => {
    const cause = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: 'test',
    });
    product.delete.mockRejectedValue(cause);
    const result = service.remove(row.id);

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toMatchObject({
      cause,
      response: { errorCode: 'PRODUCT_NOT_FOUND' },
    });
  });

  it('preserves other delete errors', async () => {
    const error = new Error('Database unavailable');
    product.delete.mockRejectedValue(error);

    await expect(service.remove(row.id)).rejects.toBe(error);
  });
});
