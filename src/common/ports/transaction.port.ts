export interface TransactionCtx {
  readonly _brand?: unique symbol;
}

export abstract class TransactionManager {
  abstract run<T>(fn: (tx: TransactionCtx) => Promise<T>): Promise<T>;
}
