import type { LatestPayment } from '../../../../common/ports/latest-payment-query.port';
import type { ShipmentSummary } from '../../../../common/ports/shipment-query.port';

export abstract class OrderPaymentReader {
  abstract findLatest(orderId: string): Promise<LatestPayment | null>;
}

export abstract class OrderShipmentReader {
  abstract findByItemIds(itemIds: string[]): Promise<ShipmentSummary[]>;
}
