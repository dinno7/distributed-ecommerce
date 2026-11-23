export class Money {
  readonly currency = 'IRR';

  constructor(readonly minorUnits: bigint) {
    if (minorUnits < 0n || minorUnits > 9_223_372_036_854_775_807n) {
      throw new RangeError('Price must be a nonnegative 64-bit integer');
    }
  }
}
