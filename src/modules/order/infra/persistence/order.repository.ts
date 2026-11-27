import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/infra/persistence/prisma.service';
import type { TransactionCtx } from '../../../../common/ports/transaction.port';
import type { Prisma } from '../../../../generated/prisma/client.js';
import type {
  OrderListRepository,
  OrderRepository,
  OrderWorkflowRepository,
} from '../../app/ports/order.repository';
import type { Order } from '../../domain/order.entity';
import { OrderMapper } from './order.mapper';

@Injectable()
export class OrderRepositoryPrisma
  implements OrderRepository, OrderWorkflowRepository
{
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

  async list({
    customerId,
    status,
    take,
    skip,
  }: Parameters<OrderListRepository['list']>[0]): Promise<Order[]> {
    const rows = await this.prisma.order.findMany({
      where: { userId: customerId, status },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { items: { take: 0 } },
      take,
      skip,
    });
    return rows.map((row) => OrderMapper.toDomain(row));
  }

  async lock(id: string, tx: TransactionCtx): Promise<Order | null> {
    const db = tx as Prisma.TransactionClient;
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE
    `;
    if (rows.length === 0) return null;
    const row = await db.order.findUniqueOrThrow({
      where: { id },
      include: { items: true },
    });
    return OrderMapper.toDomain(row);
  }

  async updateState(
    id: string,
    status: Order['status'],
    { ids, ...changes }: Parameters<OrderWorkflowRepository['updateState']>[2],
    tx: TransactionCtx,
    paymentAttemptNo?: number,
  ): Promise<void> {
    const db = tx as Prisma.TransactionClient;
    await db.order.update({
      where: { id },
      data: { status, paymentAttemptNo },
    });
    if (ids.length > 0) {
      await db.orderItem.updateMany({
        where: { orderId: id, id: { in: ids } },
        data: changes,
      });
    }
  }
}
