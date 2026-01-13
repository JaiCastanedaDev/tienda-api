import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    return this.prisma.product.create({ data: dto });
  }

  async listProducts() {
    return this.prisma.product.findMany({
      include: { stock: true },
    });
  }

  async addStock(productId: string, dto: AddStockDto) {
    const { storeId, size, color, quantity } = dto;

    const stock = await this.prisma.stock.findUnique({
      where: {
        store_product_variant: {
          storeId,
          productId,
          size,
          color,
        },
      },
    });

    if (stock) {
      return this.prisma.stock.update({
        where: { id: stock.id },
        data: {
          quantity: { increment: quantity },
        },
      });
    }

    return this.prisma.stock.create({
      data: {
        productId,
        storeId,
        size,
        color,
        quantity,
      },
    });
  }
}