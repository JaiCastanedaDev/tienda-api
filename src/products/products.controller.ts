import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles('OWNER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(user.tenantId, dto);
  }

  @Get()
  @Roles('OWNER', 'SELLER')
  findAll(@CurrentUser() user: UserPayload) {
    return this.productsService.listProducts(user.tenantId);
  }

  @Post(':id/stock')
  @Roles('OWNER')
  addStock(
    @CurrentUser() user: UserPayload,
    @Param('id') productId: string,
    @Body() dto: AddStockDto,
  ) {
    return this.productsService.addStock(user.tenantId, productId, dto);
  }
}
