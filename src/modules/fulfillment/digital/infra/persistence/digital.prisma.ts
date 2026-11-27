import type { DigitalAccessGrant } from '../../domain/access-grant';
import { Injectable } from '@nestjs/common';
import type { TransactionCtx } from '../../../../../common/ports/transaction.port';
import type { Prisma } from '../../../../../generated/prisma/client';
import type { DigitalGrants } from '../../app/ports/digital.port';

@Injectable()
export class PrismaDigitalGrants implements DigitalGrants {
  async grant(data: DigitalAccessGrant, tx: TransactionCtx): Promise<void> {
    await (tx as Prisma.TransactionClient).digitalGrant.create({ data });
  }
}
