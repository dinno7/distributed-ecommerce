import {
  PaymentGatewayRegistry,
  UnknownPaymentGatewayError,
} from './payment-gateway.registry';

describe('PaymentGatewayRegistry', () => {
  const mock = { createCheckout: jest.fn(), resolveCallback: jest.fn() };
  const other = { createCheckout: jest.fn(), resolveCallback: jest.fn() };
  const registry = new PaymentGatewayRegistry([
    ['mock', mock],
    ['other', other],
  ]);

  it('selects the requested strategy on each lookup', () => {
    expect(registry.get('mock')).toBe(mock);
    expect(registry.get('other')).toBe(other);
  });

  it('rejects unregistered names', () => {
    expect(() => registry.get('unknown')).toThrow(UnknownPaymentGatewayError);
  });
});
