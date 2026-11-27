export interface LatestPayment {
  paymentId: string | null;
  status: 'PENDING' | 'AWAITING_CUSTOMER' | 'SUCCEEDED' | 'FAILED';
  checkoutUrl: string | null;
  amountMinor: bigint;
  currency: string;
  failureCode?: 'PAYMENT_DECLINED' | 'PAYMENT_TIMED_OUT';
}

export abstract class LatestPaymentQuery {
  abstract execute(orderId: string): Promise<LatestPayment | null>;
}
