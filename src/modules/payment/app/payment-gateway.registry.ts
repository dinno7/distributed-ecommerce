import type { PaymentGateway } from './ports/payment-gateway.port';

export class UnknownPaymentGatewayError extends Error {
  constructor(name: string) {
    super(`Unknown payment gateway: ${name}`);
  }
}

export class PaymentGatewayRegistry {
  private readonly gateways: ReadonlyMap<string, PaymentGateway>;

  constructor(entries: ReadonlyArray<readonly [string, PaymentGateway]>) {
    this.gateways = new Map(entries);
  }

  get(name: string): PaymentGateway {
    const gateway = this.gateways.get(name);
    if (!gateway) throw new UnknownPaymentGatewayError(name);
    return gateway;
  }
}
