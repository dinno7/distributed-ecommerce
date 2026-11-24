import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { Prisma } from '../../../../generated/prisma/client.js';
import type { OrderRepository } from '../../app/ports/order.repository';
import type { Order } from '../../domain/order.entity';
import { OrderMapper } from './order.mapper';

@Injectable()
export class OrderRepositoryPrisma implements OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(order: Order, tx: TransactionCtx): Promise<void> {
    const transaction = tx as Prisma.TransactionClient;
    await transaction.order.create({
      data: OrderMapper.toPersistence(order),
    });
  }

  async findById(id: string): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (row === null) return null;

    return OrderMapper.toDomain(row);
  }
}
