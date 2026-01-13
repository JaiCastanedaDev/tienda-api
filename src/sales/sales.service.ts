import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSaleDto } from './dto/create-sale.dto'

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSale(dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      let total = 0

      for (const item of dto.items) {
        const stock = await tx.stock.findUnique({
          where: {
            store_product_variant: {
              storeId: dto.storeId,
              productId: item.productId,
              size: item.size,
              color: item.color,
            },
          },
          include: { product: true },
        })

        if (!stock || stock.quantity < item.quantity) {
          throw new BadRequestException(
            `Stock insuficiente para producto ${item.productId} (${item.size}/${item.color})`,
          )
        }

        total += item.quantity * stock.product.price
      }

      // 2️⃣ Crear venta
      const sale = await tx.sale.create({
        data: {
          storeId: dto.storeId,
          userId: dto.userId,
          total,
        },
      })

      // 3️⃣ Crear items y descontar stock
      for (const item of dto.items) {
        const stock = await tx.stock.findUnique({
          where: {
            store_product_variant: {
              storeId: dto.storeId,
              productId: item.productId,
              size: item.size,
              color: item.color,
            },
          },
          include: { product: true },
        })

        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            size: item.size,
            color: item.color,
            quantity: item.quantity,
            price: stock!.product.price,
          },
        })

        await tx.stock.update({
          where: { id: stock!.id },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })
      }

      return sale
    })
  }
}
