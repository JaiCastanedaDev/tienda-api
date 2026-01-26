import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { VariantImageDto } from './dto/variant-image.dto';
import { UpdateProductMetadataDto } from './dto/update-product-metadata.dto';
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

  @Put(':id')
  @Roles('OWNER')
  update(
    @CurrentUser() user: UserPayload,
    @Param('id') productId: string,
    @Body() dto: UpdateProductMetadataDto,
  ) {
    return this.productsService.updateProductMetadata(
      user.tenantId,
      productId,
      dto,
    );
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

  @Post('variant-image')
  @Roles('OWNER')
  addVariantImage(
    @CurrentUser() user: UserPayload,
    @Body() dto: VariantImageDto,
  ) {
    return this.productsService.addVariantImage(user.tenantId, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  remove(@CurrentUser() user: UserPayload, @Param('id') productId: string) {
    return this.productsService.deleteProduct(user.tenantId, productId);
  }
}
