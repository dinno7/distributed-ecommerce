import { Body, Controller, Post } from '@nestjs/common';
import { Idempotent } from '@nestjs/idempotency';
import { CreateOrderUC } from '../../app/usecases/create-order.uc';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly createOrderUC: CreateOrderUC) {}

  @Post()
  @Idempotent({ required: true })
  create(@Body() payload: CreateOrderDto) {
    return this.createOrderUC.execute({
      customerId: payload.customerId,
      items: payload.items,
    });
  }
}
