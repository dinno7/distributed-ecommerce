import { Injectable } from '@nestjs/common';
import {
  TransactionCtx,
  TransactionManager,
} from '../../ports/transaction.port';
import { PrismaService } from './prisma.service';
import { Prisma } from '../../../generated/prisma/client';

export type PrismaDbClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class PrismaTransactionManager implements TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(fn: (tx: TransactionCtx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx as TransactionCtx));
  }
}
