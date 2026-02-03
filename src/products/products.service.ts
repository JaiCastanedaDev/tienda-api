import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { VariantImageDto } from './dto/variant-image.dto';
import { UpdateProductMetadataDto } from './dto/update-product-metadata.dto';
import type { VariantImageInputDto } from './dto/create-product.dto';
import type { UpdateVariantImageDto } from './dto/update-product-metadata.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createProduct(tenantId: string, dto: CreateProductDto) {
    const { name, sku, price, variants, images } = dto;

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
                images: v.images?.length
                  ? {
                      create: v.images.map((img) => ({
                        url: img.url,
                        alt: img.alt,
                        isPrimary: img.isPrimary ?? false,
                        sortOrder: img.sortOrder ?? 0,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        variants: {
          include: {
            stock: true,
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
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
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
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

  async addVariantImage(tenantId: string, dto: VariantImageDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: {
        productId_size_color: {
          productId: dto.productId,
          size: dto.size,
          color: dto.color,
        },
      },
      select: { id: true, product: { select: { tenantId: true } } },
    });

    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    if (variant.product.tenantId !== tenantId) {
      throw new ForbiddenException(
        'No puedes modificar productos de otra tienda',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.variantImage.updateMany({
          where: { productVariantId: variant.id, isPrimary: true },
          data: { isPrimary: false },
        });
      }

      return tx.variantImage.create({
        data: {
          productVariantId: variant.id,
          url: dto.url,
          alt: dto.alt,
          isPrimary: dto.isPrimary ?? false,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    });
  }

  async updateProductMetadata(
    tenantId: string,
    productId: string,
    dto: UpdateProductMetadataDto,
  ) {
    // Verificar que el producto exista y pertenezca al tenant
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Si hay imágenes para crear/actualizar, hacerlo en una transacción
    if (dto.images && dto.images.length > 0) {
      const images = dto.images; // Asegurar que TypeScript entienda que no es undefined
      return this.prisma.$transaction(async (tx) => {
        // Actualizar metadata del producto
        const updatedProduct = await tx.product.update({
          where: { id: productId },
          data: {
            name: dto.name,
            sku: dto.sku,
            price: dto.price,
          },
        });

        // Crear imágenes para la primera variante del producto
        const firstVariant = await tx.productVariant.findFirst({
          where: { productId },
        });

        if (firstVariant) {
          // Si hay una imagen marcada como primaria, desmarcar todas las demás
          const hasPrimary = images.some((img) => img.isPrimary);
          if (hasPrimary) {
            await tx.variantImage.updateMany({
              where: {
                productVariantId: firstVariant.id,
                isPrimary: true,
              },
              data: { isPrimary: false },
            });
          }

          // Crear las nuevas imágenes
          for (const img of images) {
            await tx.variantImage.create({
              data: {
                productVariantId: firstVariant.id,
                url: img.url,
                alt: img.alt,
                isPrimary: img.isPrimary ?? false,
                sortOrder: img.sortOrder ?? 0,
              },
            });
          }
        }

        return tx.product.findUnique({
          where: { id: productId },
          include: {
            variants: {
              include: {
                stock: true,
                images: {
                  orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                },
              },
            },
          },
        });
      });
    }

    // Si no hay imágenes, hacer un update simple
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name,
        sku: dto.sku,
        price: dto.price,
      },
      include: {
        variants: {
          include: {
            stock: true,
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            },
          },
        },
      },
    });
  }

  async deleteProduct(tenantId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true, active: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.active) {
      return { message: 'Producto ya estaba eliminado' };
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { active: false },
    });

    return { message: 'Producto eliminado' };
  }
}
