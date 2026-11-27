import { Module } from '@nestjs/common';
import { ProductCatalog } from '../../common/ports/product-catalog.port';
import { ProductStockReservation } from '../../common/ports/product-stock-reservation.port';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    { provide: ProductCatalog, useExisting: ProductService },
    { provide: ProductStockReservation, useExisting: ProductService },
  ],
  exports: [ProductCatalog, ProductStockReservation],
})
export class ProductModule {}
