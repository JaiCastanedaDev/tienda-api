import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const { name, sku, price, variants } = dto;

    return this.prisma.product.create({
      data: {
        tenantId,
        name,
        sku,
        price,
        variants: variants?.length
          ? {
              create: variants.map((v) => ({
                size: v.size,
                color: v.color,
                stock: {
                  create: {
                    quantity: v.quantity,
                  },
                },
              })),
            }
          : undefined,
      },
      include: {
        variants: {
          include: {
            stock: true,
          },
        },
      },
    });
  }

  async listProducts(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId, active: true },
      include: {
        variants: {
          include: {
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addStock(tenantId: string, productId: string, dto: AddStockDto) {
    const { size, color, quantity } = dto;

    // asegurar que el producto exista y pertenezca al tenant
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Buscar o crear la variante
    const variant = await this.prisma.productVariant.upsert({
      where: {
        productId_size_color: {
          productId,
          size,
          color,
        },
      },
      update: {},
      create: {
        productId,
        size,
        color,
      },
    });

    const stock = await this.prisma.stock.upsert({
      where: { productVariantId: variant.id },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        productVariantId: variant.id,
        quantity,
      },
    });

    await this.prisma.stockMovement.create({
      data: {
        tenantId,
        productVariantId: variant.id,
        type: 'IN',
        quantity,
      },
    });

    return stock;
  }
}
