export interface DashboardMetrics {
  // Métricas del mes actual
  monthlyRevenue: number;
  monthlyUnits: number;
  monthlySales: number;

  // Comparación con mes anterior
  revenueChange: number; // Porcentaje de cambio
  unitsChange: number;
  salesChange: number;

  // Productos más vendidos
  topProducts: TopProduct[];

  // Ventas por día (últimos 30 días)
  dailySales: DailySale[];

  // Estadísticas adicionales
  averageOrderValue: number;
  totalCustomers: number;
  lowStockProducts: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  sku: string;
  variantId: string;
  size: string;
  color: string;
  unitsSold: number;
  revenue: number;
}

export interface DailySale {
  date: string;
  sales: number;
  revenue: number;
  units: number;
}
