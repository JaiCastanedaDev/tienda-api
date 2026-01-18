import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSale(dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      let total = 0;

      // 1) Validar existencia de variantes y stock + calcular total
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
          tenantId: dto.tenantId,
          userId: dto.userId,
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

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productVariantId: variant.id,
            quantity: item.quantity,
            price: variant.product.price,
          },
        });

        // Descontar stock (si no existiera registro de stock, esto fallará; por eso validamos arriba)
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
            tenantId: dto.tenantId,
            productVariantId: variant.id,
            type: 'OUT',
            quantity: item.quantity,
          },
        });
      }

      return sale;
    });
  }
}
