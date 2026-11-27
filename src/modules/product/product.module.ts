import { Module } from '@nestjs/common';
import { ProductStockReservation } from '../../common/ports/product-stock-reservation.port';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { ProductCatalogRpcConsumer } from './product-catalog.rpc.consumer';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    ProductCatalogRpcConsumer,
    { provide: ProductStockReservation, useExisting: ProductService },
  ],
  exports: [ProductStockReservation],
})
export class ProductModule {}
