import { Injectable } from '@nestjs/common';
import { LatestPaymentQuery } from '../../../../common/ports/latest-payment-query.port';
import { ShipmentQuery } from '../../../../common/ports/shipment-query.port';
import type {
  OrderPaymentReader,
  OrderShipmentReader,
} from '../../app/ports/order-related-data.port';

@Injectable()
export class OrderPaymentAdapter implements OrderPaymentReader {
  constructor(private readonly payments: LatestPaymentQuery) {}

  findLatest(orderId: string) {
    return this.payments.execute(orderId);
  }
}

@Injectable()
export class OrderShipmentAdapter implements OrderShipmentReader {
  constructor(private readonly shipments: ShipmentQuery) {}

  findByItemIds(itemIds: string[]) {
    return this.shipments.listShipments(itemIds);
  }
}
