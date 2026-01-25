import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiContextService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTenantContext(params: {
    tenantId: string;
    days: number;
    topProductsLimit?: number;
    lowStockThreshold?: number;
  }) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - params.days);

    const topProductsLimit = params.topProductsLimit ?? 10;
    const lowStockThreshold = params.lowStockThreshold ?? 5;

    const [
      tenant,
      productsCount,
      variantsCount,
      stockAgg,
      lowStock,
      slowMovers,
    ] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true, plan: true },
      }),
      this.prisma.product.count({
        where: { tenantId: params.tenantId, active: true },
      }),
      this.prisma.productVariant.count({
        where: { product: { tenantId: params.tenantId, active: true } },
      }),
      this.prisma.stock.aggregate({
        where: {
          productVariant: {
            product: { tenantId: params.tenantId, active: true },
          },
        },
        _sum: { quantity: true },
      }),
      this.prisma.stock.findMany({
        where: {
          quantity: { lt: lowStockThreshold },
          productVariant: {
            product: { tenantId: params.tenantId, active: true },
          },
        },
        include: {
          productVariant: { include: { product: true } },
        },
        orderBy: { quantity: 'asc' },
        take: 25,
      }),
      (async () => {
        // Unidades vendidas por variante en ventana (days)
        const items = await this.prisma.saleItem.findMany({
          where: {
            sale: {
              tenantId: params.tenantId,
              createdAt: { gte: start, lte: now },
            },
          },
          select: { productVariantId: true, quantity: true },
        });

        const soldMap = new Map<string, number>();
        for (const it of items) {
          soldMap.set(
            it.productVariantId,
            (soldMap.get(it.productVariantId) ?? 0) + it.quantity,
          );
        }

        const variants = await this.prisma.productVariant.findMany({
          where: { product: { tenantId: params.tenantId, active: true } },
          include: { product: true, stock: true },
        });

        return variants
          .map((v) => ({
            variantId: v.id,
            productId: v.productId,
            name: v.product.name,
            sku: v.product.sku,
            size: v.size,
            color: v.color,
            price: v.product.price,
            stock: v.stock?.quantity ?? 0,
            sold: soldMap.get(v.id) ?? 0,
          }))
          .sort((a, b) => a.sold - b.sold)
          .slice(0, 25);
      })(),
    ]);

    // Top productos por unidades y revenue en ventana
    const topItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: params.tenantId,
          createdAt: { gte: start, lte: now },
        },
      },
      include: { productVariant: { include: { product: true } } },
    });

    const topMap = new Map<
      string,
      {
        variantId: string;
        productId: string;
        name: string;
        sku: string;
        size: string;
        color: string;
        unitsSold: number;
        revenue: number;
      }
    >();

    for (const item of topItems) {
      const key = item.productVariantId;
      const existing = topMap.get(key);
      const revenue = item.price * item.quantity;

      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenue += revenue;
      } else {
        topMap.set(key, {
          variantId: key,
          productId: item.productVariant.productId,
          name: item.productVariant.product.name,
          sku: item.productVariant.product.sku,
          size: item.productVariant.size,
          color: item.productVariant.color,
          unitsSold: item.quantity,
          revenue,
        });
      }
    }

    const topSelling = Array.from(topMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, topProductsLimit);

    return {
      tenant: {
        id: params.tenantId,
        name: tenant?.name ?? null,
        plan: tenant?.plan ?? null,
      },
      window: {
        days: params.days,
        from: start.toISOString(),
        to: now.toISOString(),
      },
      catalog: {
        productsCount,
        variantsCount,
      },
      inventory: {
        totalUnits: stockAgg._sum.quantity ?? 0,
        lowStockThreshold,
        lowStock: lowStock.map((s) => ({
          variantId: s.productVariantId,
          name: s.productVariant.product.name,
          sku: s.productVariant.product.sku,
          size: s.productVariant.size,
          color: s.productVariant.color,
          stock: s.quantity,
          price: s.productVariant.product.price,
        })),
      },
      sales: {
        topSelling,
      },
      slowMovers,
    };
  }
}
