import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { CreateOrderUC } from '../../app/usecases/create-order.uc';
import { GetOrderUC } from '../../app/usecases/get-order.uc';
import { ListOrdersUC } from '../../app/usecases/list-orders.uc';
import { RetryOrderFulfillmentUC } from '../../app/usecases/retry-order-fulfillment.uc';
import type { Order } from '../../domain/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderListDto, RetryOrderDto } from './dto/order-query.dto';

@Controller('orders')
export class OrderController {
  constructor(
    private readonly createOrderUC: CreateOrderUC,
    private readonly getOrder: GetOrderUC,
    private readonly listOrders: ListOrdersUC,
    private readonly retryFulfillment: RetryOrderFulfillmentUC,
  ) {}

  @Post()
  @Idempotent({ required: true })
  async create(@Body() payload: CreateOrderDto) {
    const { id, customerId, status, currency, createdAt } =
      await this.createOrderUC.execute(payload);
    return {
      id,
      customerId,
      status,
      currency,
      createdAt: createdAt.toISOString(),
    };
  }

  @Get()
  async list(@Query() query: OrderListDto) {
    const orders = await this.listOrders.execute(query);
    return {
      orders: orders.map(summary),
      page: query.page,
      per_page: query.per_page,
    };
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string) {
    const { order, payment, shipments } = await this.getOrder.execute(id);
    return {
      ...summary(order),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productType: item.productType,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor.toString(),
        status: item.status,
        attempts: item.attempts,
        failureCode: item.lastError,
      })),
      payment: payment && {
        ...payment,
        amountMinor: payment.amountMinor.toString(),
      },
      shipments,
    };
  }

  @Post(':id/retry')
  @HttpCode(202)
  @Idempotent({ required: true })
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: RetryOrderDto,
  ) {
    return this.retryFulfillment.execute({
      orderId: id.toLowerCase(),
      itemId: payload?.itemId?.toLowerCase(),
    });
  }
}

function summary(order: Order) {
  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    totalMinor: order.totalMinor.toString(),
    currency: order.currency,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
