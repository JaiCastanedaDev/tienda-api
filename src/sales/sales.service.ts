import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSale(tenantId: string, userId: string, dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      let total = 0;

      // 1) Validar existencia de variantes, pertenencia a tenant y stock + calcular total
      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: item.productId,
              size: item.size,
              color: item.color,
            },
          },
          include: {
            product: true,
            stock: true,
          },
        });

        if (!variant) {
          throw new NotFoundException(
            `No existe variante para producto ${item.productId} (${item.size}/${item.color})`,
          );
        }

        // Seguridad multi-tenant: el producto de la variante debe ser del tenant
        if (variant.product.tenantId !== tenantId) {
          throw new ForbiddenException(
            'No puedes vender productos de otra tienda',
          );
        }

        const available = variant.stock?.quantity ?? 0;
        if (available < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para producto ${item.productId} (${item.size}/${item.color})`,
          );
        }

        total += item.quantity * variant.product.price;
      }

      // 2) Crear venta
      const sale = await tx.sale.create({
        data: {
          tenantId,
          userId,
          total,
        },
      });

      // 3) Crear items + descontar stock + registrar movimiento
      for (const item of dto.items) {
        const variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: item.productId,
              size: item.size,
              color: item.color,
            },
          },
          include: {
            product: true,
          },
        });

        if (!variant) {
          throw new NotFoundException(
            `No existe variante para producto ${item.productId} (${item.size}/${item.color})`,
          );
        }

        // Defensa extra
        if (variant.product.tenantId !== tenantId) {
          throw new ForbiddenException(
            'No puedes vender productos de otra tienda',
          );
        }

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productVariantId: variant.id,
            quantity: item.quantity,
            price: variant.product.price,
          },
        });

        await tx.stock.update({
          where: { productVariantId: variant.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId,
            productVariantId: variant.id,
            type: 'OUT',
            quantity: item.quantity,
          },
        });
      }

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              productVariant: {
                include: { product: true },
              },
            },
          },
        },
      });
    });
  }

  async listSales(tenantId: string) {
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
