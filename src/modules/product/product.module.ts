import { Module } from '@nestjs/common';
import { ProductCatalog } from '../../common/ports/product-catalog.port';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    { provide: ProductCatalog, useExisting: ProductService },
  ],
  exports: [ProductCatalog],
})
export class ProductModule {}
