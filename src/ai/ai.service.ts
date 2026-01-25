import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { OpenRouterService } from './openrouter.service';
import type { OpenRouterMessage } from './ai.types';

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboardService: DashboardService,
    private readonly openRouter: OpenRouterService,
  ) {}

  private defaultModel(): string {
    return process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini';
  }

  private systemPrompt(): string {
    return [
      'Eres un asesor de compras e inventario para una tienda de ropa.',
      'Objetivo: recomendar qué comprar el próximo mes basándote en ventas, stock, rotación, y riesgo de quiebre de stock.',
      'Responde en español, con bullets y números cuando aplique.',
      'Si faltan datos, explica qué falta y cómo medirlo.',
      'No inventes métricas si no están en el contexto.',
      'No incluyas datos sensibles de usuarios.',
    ].join('\n');
  }

  private buildInsightsPrompt(input: {
    tenantName?: string;
    days: number;
    metrics: any;
    inventorySummary: any;
    topProducts: any;
    slowMovers: any;
    lowStockVariants: any;
  }): string {
    return [
      `Contexto de tienda: ${input.tenantName ?? 'N/A'}`,
      `Horizonte de análisis: últimos ${input.days} días`,
      '',
      'Métricas dashboard (mes actual):',
      JSON.stringify(input.metrics),
      '',
      'Resumen inventario:',
      JSON.stringify(input.inventorySummary),
      '',
      'Top productos/variantes (mes actual):',
      JSON.stringify(input.topProducts),
      '',
      'Productos/variantes con baja rotación (últimos N días):',
      JSON.stringify(input.slowMovers),
      '',
      'Variantes con riesgo de quiebre (stock bajo):',
      JSON.stringify(input.lowStockVariants),
      '',
      'Tarea:',
      '1) Recomienda un plan de compra para el próximo mes (prioriza reabastos vs novedades).',
      '2) Lista 5-10 recomendaciones accionables, cada una con: qué comprar, por qué, cantidad sugerida (si se puede inferir), y riesgo.',
      '3) Señala productos a liquidar o pausar compras.',
      '4) Sugiere mejoras de operación (precios, bundles, reposición, promociones).',
      'Devuelve también una sección final: "Ideas extra de IA" con 5 ideas de funcionalidades para el dueño.',
    ].join('\n');
  }

  async getInsights(params: { tenantId: string; days: number }) {
    const days = params.days;
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days);

    const [tenant, metrics, inventorySummary] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true },
      }),
      this.dashboardService.getMetrics(params.tenantId),
      this.dashboardService.getInventorySummary(params.tenantId),
    ]);

    // Variantes con bajo stock (umbral=5), para riesgo de quiebre
    const lowStockVariants = await this.prisma.stock.findMany({
      where: {
        quantity: { lt: 5 },
        productVariant: {
          product: { tenantId: params.tenantId, active: true },
        },
      },
      include: {
        productVariant: {
          include: { product: true },
        },
      },
      take: 30,
    });

    // Slow movers: variantes sin ventas recientes o con pocas unidades vendidas
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId: params.tenantId,
          createdAt: { gte: start, lte: now },
        },
      },
      select: { productVariantId: true, quantity: true },
    });

    const soldMap = new Map<string, number>();
    for (const si of saleItems) {
      soldMap.set(
        si.productVariantId,
        (soldMap.get(si.productVariantId) ?? 0) + si.quantity,
      );
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        product: { tenantId: params.tenantId, active: true },
      },
      include: {
        product: true,
        stock: true,
      },
    });

    const slowMovers = variants
      .map((v) => ({
        variantId: v.id,
        productId: v.productId,
        name: v.product.name,
        sku: v.product.sku,
        size: v.size,
        color: v.color,
        stock: v.stock?.quantity ?? 0,
        soldLastNDays: soldMap.get(v.id) ?? 0,
        price: v.product.price,
      }))
      .sort((a, b) => a.soldLastNDays - b.soldLastNDays)
      .slice(0, 20);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: this.buildInsightsPrompt({
          tenantName: tenant?.name,
          days,
          metrics,
          inventorySummary,
          topProducts: metrics.topProducts,
          slowMovers,
          lowStockVariants: lowStockVariants.map((s) => ({
            variantId: s.productVariantId,
            name: s.productVariant.product.name,
            sku: s.productVariant.product.sku,
            size: s.productVariant.size,
            color: s.productVariant.color,
            stock: s.quantity,
            price: s.productVariant.product.price,
          })),
        }),
      },
    ];

    const result = await this.openRouter.chat({
      model: this.defaultModel(),
      messages,
      temperature: 0.2,
      maxTokens: 900,
    });

    return {
      model: this.defaultModel(),
      days,
      usage: result.usage,
      insights: result.content,
    };
  }

  async chat(params: { tenantId: string; message: string; context?: string }) {
    // Contexto ligero para chat: resumen + top productos
    const metrics = await this.dashboardService.getMetrics(params.tenantId);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: [
          'Resumen rápido (dashboard):',
          JSON.stringify({
            monthlyRevenue: metrics.monthlyRevenue,
            monthlyUnits: metrics.monthlyUnits,
            monthlySales: metrics.monthlySales,
            topProducts: metrics.topProducts,
            lowStockProducts: metrics.lowStockProducts,
          }),
          params.context
            ? `\nContexto adicional del dueño: ${params.context}`
            : '',
          `\nPregunta del dueño: ${params.message}`,
        ].join('\n'),
      },
    ];

    const result = await this.openRouter.chat({
      model: this.defaultModel(),
      messages,
      temperature: 0.3,
      maxTokens: 700,
    });

    return {
      model: this.defaultModel(),
      usage: result.usage,
      answer: result.content,
    };
  }
}
