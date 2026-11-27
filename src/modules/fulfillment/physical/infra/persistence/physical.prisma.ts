import { Injectable } from '@nestjs/common';
import { randomUUIDv7 } from 'node:crypto';
import { PrismaService } from '../../../../../common/infra/persistence/prisma.service';
import type { TransactionCtx } from '../../../../../common/ports/transaction.port';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { ShipmentQuery } from '../../../../../common/ports/shipment-query.port';
import type { PhysicalFulfillment } from '../../app/ports/physical.port';

@Injectable()
export class PrismaPhysicalFulfillment
  implements PhysicalFulfillment, ShipmentQuery
{
  constructor(private readonly db: PrismaService) {}

  async ship(
    orderItemId: string,
    quantity: number,
    tx: TransactionCtx,
  ): Promise<string> {
    const id = randomUUIDv7();
    await (tx as Prisma.TransactionClient).shipment.create({
      data: { id, orderItemId, quantity },
    });
    return id;
  }

  listShipments(itemIds: string[]) {
    return this.db.shipment.findMany({
      where: { orderItemId: { in: itemIds } },
      orderBy: { id: 'asc' },
    });
  }
}
