import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(dto: CreateProductDto) {
    const { tenantId, name, sku, price, variants } = dto;

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

  async listProducts() {
    return this.prisma.product.findMany({
      include: {
        variants: {
          include: {
            stock: true,
          },
        },
      },
    });
  }

  async addStock(productId: string, dto: AddStockDto) {
    const { tenantId, size, color, quantity } = dto;

    // Validación simple: asegurar que el producto exista y pertenezca al tenant
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException(
        'Producto no encontrado para el tenant indicado',
      );
    }

    // Buscar o crear la variante usando la unique compuesta (productId,size,color)
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

    // Stock es 1:1 con la variante y la clave única es productVariantId
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

    // Registrar movimiento (opcional pero útil)
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
