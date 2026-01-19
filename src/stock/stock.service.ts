import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  private async assertVariantAccessible(
    tx: PrismaService,
    tenantId: string,
    productVariantId: string,
  ) {
    // 1) Existe?
    const exists = await tx.productVariant.findUnique({
      where: { id: productVariantId },
      select: {
        id: true,
        product: { select: { tenantId: true } },
      },
    });

    if (!exists) {
      throw new NotFoundException('Variante no encontrada');
    }

    // 2) Pertenece al tenant?
    if (exists.product.tenantId !== tenantId) {
      throw new ForbiddenException(
        'No tienes permisos para modificar el stock de esta variante',
      );
    }
  }

  async listStock(tenantId: string, opts?: { lowOnly?: boolean }) {
    const LOW_STOCK_THRESHOLD = 5;

    return this.prisma.productVariant.findMany({
      where: {
        product: { tenantId, active: true },
        ...(opts?.lowOnly
          ? {
              stock: {
                is: {
                  quantity: { lt: LOW_STOCK_THRESHOLD },
                },
              },
            }
          : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            active: true,
          },
        },
        stock: true,
      },
      orderBy: [
        { product: { name: 'asc' } },
        { size: 'asc' },
        { color: 'asc' },
      ],
    });
  }

  async getVariantStock(tenantId: string, productVariantId: string) {
    // Primero, validar acceso para errores más claros
    await this.assertVariantAccessible(this.prisma, tenantId, productVariantId);

    const variant = await this.prisma.productVariant.findFirst({
      where: {
        id: productVariantId,
        product: { tenantId },
      },
      include: {
        product: true,
        stock: true,
      },
    });

    // variant debe existir aquí por assertVariantAccessible; fallback defensivo
    if (!variant) {
      throw new NotFoundException('Variante no encontrada');
    }

    return variant;
  }

  async adjustStock(input: {
    tenantId: string;
    productVariantId: string;
    quantity: number;
    reason: string;
  }) {
    if (input.quantity === 0) {
      throw new BadRequestException('quantity no puede ser 0');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertVariantAccessible(
        tx as unknown as PrismaService,
        input.tenantId,
        input.productVariantId,
      );

      const variant = await tx.productVariant.findFirst({
        where: {
          id: input.productVariantId,
          product: { tenantId: input.tenantId },
        },
        include: {
          stock: true,
          product: true,
        },
      });

      if (!variant) {
        throw new NotFoundException('Variante no encontrada');
      }

      const currentQty = variant.stock?.quantity ?? 0;
      const newQty = currentQty + input.quantity;

      if (newQty < 0) {
        throw new BadRequestException('Stock insuficiente para este ajuste');
      }

      const stock = await tx.stock.upsert({
        where: { productVariantId: variant.id },
        create: { productVariantId: variant.id, quantity: newQty },
        update: { quantity: newQty },
      });

      await tx.stockMovement.create({
        data: {
          tenantId: input.tenantId,
          productVariantId: variant.id,
          type: input.quantity > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(input.quantity),
        },
      });

      return {
        stock,
        previousQuantity: currentQty,
        newQuantity: newQty,
        movement: {
          type: input.quantity > 0 ? 'IN' : 'OUT',
          quantity: Math.abs(input.quantity),
          reason: input.reason,
        },
      };
    });
  }

  async setStock(input: {
    tenantId: string;
    productVariantId: string;
    quantity: number;
    reason: string;
  }) {
    if (input.quantity < 0) {
      throw new BadRequestException('quantity no puede ser negativo');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.assertVariantAccessible(
        tx as unknown as PrismaService,
        input.tenantId,
        input.productVariantId,
      );

      const variant = await tx.productVariant.findFirst({
        where: {
          id: input.productVariantId,
          product: { tenantId: input.tenantId },
        },
        include: {
          stock: true,
        },
      });

      if (!variant) {
        throw new NotFoundException('Variante no encontrada');
      }

      const currentQty = variant.stock?.quantity ?? 0;
      const diff = input.quantity - currentQty;

      const stock = await tx.stock.upsert({
        where: { productVariantId: variant.id },
        create: { productVariantId: variant.id, quantity: input.quantity },
        update: { quantity: input.quantity },
      });

      if (diff !== 0) {
        await tx.stockMovement.create({
          data: {
            tenantId: input.tenantId,
            productVariantId: variant.id,
            type: diff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(diff),
          },
        });
      }

      return {
        stock,
        previousQuantity: currentQty,
        newQuantity: input.quantity,
        movement:
          diff === 0
            ? null
            : {
                type: diff > 0 ? 'IN' : 'OUT',
                quantity: Math.abs(diff),
                reason: input.reason,
              },
      };
    });
  }

  async listMovements(tenantId: string, opts?: { take?: number }) {
    return this.prisma.stockMovement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: opts?.take ?? 50,
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
    });
  }
}
