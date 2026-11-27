import type { TransactionCtx } from '../../../../../common/ports/transaction.port';
import type { DigitalAccessGrant } from '../../domain/access-grant';

export abstract class DigitalGrants {
  abstract grant(grant: DigitalAccessGrant, tx: TransactionCtx): Promise<void>;
}
