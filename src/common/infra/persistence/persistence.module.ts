import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { TransactionManager } from '../../ports/transaction.port.js';
import { PrismaTransactionManager } from './prisma.tx-manager.js';

@Global()
@Module({
  providers: [
    PrismaService,
    PrismaTransactionManager,
    {
      provide: TransactionManager,
      useClass: PrismaTransactionManager,
    },
  ],
  exports: [PrismaService, TransactionManager, PrismaTransactionManager],
})
export class PersistenceModule {}
