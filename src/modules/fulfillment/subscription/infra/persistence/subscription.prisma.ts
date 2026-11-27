import { Injectable } from '@nestjs/common';
import type { TransactionCtx } from '../../../../../common/ports/transaction.port';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { Subscriptions } from '../../app/ports/subscription.port';

@Injectable()
export class PrismaSubscriptions implements Subscriptions {
  async extend(
    customerId: string,
    productId: string,
    days: bigint,
    tx: TransactionCtx,
  ): Promise<boolean> {
    const db = tx as Prisma.TransactionClient;
    // Bound the duration before constructing an interval and keep the expiry JSON-safe.
    const limit = '9999-12-31T00:00:00Z';
    const count = await db.$executeRaw`
      INSERT INTO subscriptions (customer_id, product_id, expires_at)
      SELECT ${customerId}::uuid, ${productId}::uuid,
             statement_timestamp() + ${days}::double precision * interval '24 hours'
      WHERE ${days}::bigint <= floor(extract(epoch FROM (${limit}::timestamptz - statement_timestamp())) / 86400)
      ON CONFLICT (customer_id, product_id) DO UPDATE
      SET expires_at = GREATEST(subscriptions.expires_at, clock_timestamp())
                        + ${days}::double precision * interval '24 hours'
      WHERE ${days}::bigint <= floor(extract(epoch FROM
        (${limit}::timestamptz - GREATEST(subscriptions.expires_at, clock_timestamp()))) / 86400)
    `;
    return count === 1;
  }
}
