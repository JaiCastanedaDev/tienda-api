import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Get()
  findAll() {
    return this.productsService.listProducts();
  }

  @Post(':id/stock')
  addStock(@Param('id') productId: string, @Body() dto: AddStockDto) {
    return this.productsService.addStock(productId, dto);
  }
}
