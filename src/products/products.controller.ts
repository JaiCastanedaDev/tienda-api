import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('OWNER')
  create(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Get()
  @Roles('OWNER', 'SELLER')
  findAll() {
    return this.productsService.listProducts();
  }

  @Post(':id/stock')
  @Roles('OWNER')
  addStock(@Param('id') productId: string, @Body() dto: AddStockDto) {
    return this.productsService.addStock(productId, dto);
  }
}
