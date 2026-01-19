import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  DashboardMetrics,
  TopProduct,
  DailySale,
} from './interfaces/dashboard-metrics.interface';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(tenantId: string): Promise<DashboardMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // Obtener métricas del mes actual en paralelo
    const [
      currentMonthSales,
      lastMonthSales,
      topProducts,
      dailySales,
      lowStockCount,
    ] = await Promise.all([
      this.getMonthSales(tenantId, startOfMonth, now),
      this.getMonthSales(tenantId, startOfLastMonth, endOfLastMonth),
      this.getTopProducts(tenantId, startOfMonth, now),
      this.getDailySales(tenantId, thirtyDaysAgo, now),
      this.getLowStockCount(tenantId),
    ]);

    // Calcular cambios porcentuales
    const revenueChange = this.calculatePercentageChange(
      lastMonthSales.revenue,
      currentMonthSales.revenue,
    );
    const unitsChange = this.calculatePercentageChange(
      lastMonthSales.units,
      currentMonthSales.units,
    );
    const salesChange = this.calculatePercentageChange(
      lastMonthSales.count,
      currentMonthSales.count,
    );

    // Calcular promedio de valor por orden
    const averageOrderValue =
      currentMonthSales.count > 0
        ? currentMonthSales.revenue / currentMonthSales.count
        : 0;

    // Contar clientes únicos (usando userId de las ventas)
    const uniqueCustomers = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startOfMonth,
          lte: now,
        },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return {
      monthlyRevenue: currentMonthSales.revenue,
      monthlyUnits: currentMonthSales.units,
      monthlySales: currentMonthSales.count,
      revenueChange,
      unitsChange,
      salesChange,
      topProducts,
      dailySales,
      averageOrderValue: Math.round(averageOrderValue),
      totalCustomers: uniqueCustomers.length,
      lowStockProducts: lowStockCount,
    };
  }

  private async getMonthSales(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ revenue: number; units: number; count: number }> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
    });

    const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const units = sales.reduce(
      (sum, sale) =>
        sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const count = sales.length;

    return { revenue, units, count };
  }

  private async getTopProducts(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 10,
  ): Promise<TopProduct[]> {
    const salesItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
    });

    // Agrupar por variante y calcular totales
    const productMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        variantId: string;
        size: string;
        color: string;
        unitsSold: number;
        revenue: number;
      }
    >();

    salesItems.forEach((item) => {
      const key = item.productVariantId;
      const existing = productMap.get(key);

      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenue += item.price * item.quantity;
      } else {
        productMap.set(key, {
          productId: item.productVariant.productId,
          productName: item.productVariant.product.name,
          sku: item.productVariant.product.sku,
          variantId: item.productVariantId,
          size: item.productVariant.size,
          color: item.productVariant.color,
          unitsSold: item.quantity,
          revenue: item.price * item.quantity,
        });
      }
    });

    // Convertir a array y ordenar por unidades vendidas
    return Array.from(productMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit);
  }

  private async getDailySales(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DailySale[]> {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Agrupar por día
    const dailyMap = new Map<
      string,
      { sales: number; revenue: number; units: number }
    >();

    sales.forEach((sale) => {
      const date = sale.createdAt.toISOString().split('T')[0];
      const existing = dailyMap.get(date);
      const units = sale.items.reduce((sum, item) => sum + item.quantity, 0);

      if (existing) {
        existing.sales += 1;
        existing.revenue += sale.total;
        existing.units += units;
      } else {
        dailyMap.set(date, {
          sales: 1,
          revenue: sale.total,
          units,
        });
      }
    });

    // Convertir a array y ordenar por fecha
    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async getLowStockCount(tenantId: string): Promise<number> {
    // Consideramos bajo stock cuando hay menos de 5 unidades
    const LOW_STOCK_THRESHOLD = 5;

    const lowStock = await this.prisma.stock.count({
      where: {
        quantity: {
          lt: LOW_STOCK_THRESHOLD,
        },
        productVariant: {
          product: {
            tenantId,
            active: true,
          },
        },
      },
    });

    return lowStock;
  }

  private calculatePercentageChange(
    oldValue: number,
    newValue: number,
  ): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    return Math.round(((newValue - oldValue) / oldValue) * 100);
  }

  // Método adicional para obtener resumen de inventario
  async getInventorySummary(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        active: true,
      },
      include: {
        variants: {
          include: {
            stock: true,
          },
        },
      },
    });

    const totalProducts = products.length;
    const totalVariants = products.reduce(
      (sum, p) => sum + p.variants.length,
      0,
    );
    const totalUnits = products.reduce(
      (sum, p) =>
        sum +
        p.variants.reduce((vSum, v) => vSum + (v.stock?.quantity || 0), 0),
      0,
    );

    const inventoryValue = products.reduce(
      (sum, p) =>
        sum +
        p.variants.reduce(
          (vSum, v) => vSum + (v.stock?.quantity || 0) * p.price,
          0,
        ),
      0,
    );

    return {
      totalProducts,
      totalVariants,
      totalUnits,
      inventoryValue,
    };
  }
}
