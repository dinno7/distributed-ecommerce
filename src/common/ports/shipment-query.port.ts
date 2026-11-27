export interface ShipmentSummary {
  id: string;
  orderItemId: string;
  quantity: number;
  createdAt: Date;
}

export abstract class ShipmentQuery {
  abstract listShipments(itemIds: string[]): Promise<ShipmentSummary[]>;
}
