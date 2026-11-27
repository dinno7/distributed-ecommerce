import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductListDto } from './dto/product-list.dto';
import { ProductMapper } from './product.mapper';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() dto: CreateProductDto) {
    return ProductMapper.toResponse(await this.productService.create(dto));
  }

  @Get()
  async findAll(@Query() query: ProductListDto) {
    const products = await this.productService.findAll(
      query.limit,
      query.offset,
    );
    return products.map(ProductMapper.toResponse);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return ProductMapper.toResponse(await this.productService.findOne(id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }
}
