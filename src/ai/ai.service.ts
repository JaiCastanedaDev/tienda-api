import { Injectable } from '@nestjs/common';
import { DashboardService } from '../dashboard/dashboard.service';
import { OpenRouterService } from './openrouter.service';
import type { OpenRouterMessage } from './ai.types';
import { AiContextService } from './ai-context.service';

@Injectable()
export class AiService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly aiContext: AiContextService,
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
    context: unknown;
  }): string {
    return [
      `Contexto de tienda: ${input.tenantName ?? 'N/A'}`,
      `Horizonte de análisis: últimos ${input.days} días`,
      '',
      'Métricas dashboard (mes actual):',
      JSON.stringify(input.metrics),
      '',
      'Resumen inventario (global):',
      JSON.stringify(input.inventorySummary),
      '',
      'Contexto adicional (ventas/stock/productos en la ventana):',
      JSON.stringify(input.context),
      '',
      'Tarea:',
      '1) Recomienda un plan de compra para el próximo mes (prioriza reabastos vs novedades).',
      '2) Devuelve una lista priorizada de 5-12 recomendaciones accionables.',
      '   Cada recomendación debe incluir: {producto/sku/variante?, cantidad sugerida, motivo basado en datos, confianza (0-1), riesgo}.',
      '3) Señala productos a liquidar o pausar compras (por baja rotación o exceso de inventario).',
      '4) Haz alertas de quiebre de stock (variantes con stock bajo y alta venta).',
      '5) Sugiere 3-5 mejoras de operación (precios, bundles, reposición, promociones).',
      'Devuelve también una sección final: "Ideas extra de IA" con 5 ideas.',
    ].join('\n');
  }

  async getInsights(params: { tenantId: string; days: number }) {
    const [metrics, inventorySummary, context] = await Promise.all([
      this.dashboardService.getMetrics(params.tenantId),
      this.dashboardService.getInventorySummary(params.tenantId),
      this.aiContext.buildTenantContext({
        tenantId: params.tenantId,
        days: params.days,
        topProductsLimit: 12,
        lowStockThreshold: 5,
      }),
    ]);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: this.buildInsightsPrompt({
          tenantName: context.tenant.name ?? undefined,
          days: params.days,
          metrics,
          inventorySummary,
          context,
        }),
      },
    ];

    const result = await this.openRouter.chat({
      model: this.defaultModel(),
      messages,
      temperature: 0.2,
      maxTokens: 1200,
    });

    return {
      model: this.defaultModel(),
      days: params.days,
      usage: result.usage,
      insights: result.content,
    };
  }

  async chat(params: { tenantId: string; message: string; context?: string }) {
    const [metrics, tenantContext] = await Promise.all([
      this.dashboardService.getMetrics(params.tenantId),
      this.aiContext.buildTenantContext({
        tenantId: params.tenantId,
        days: 30,
        topProductsLimit: 8,
        lowStockThreshold: 5,
      }),
    ]);

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: this.systemPrompt() },
      {
        role: 'user',
        content: [
          'Contexto del negocio (resumen):',
          JSON.stringify({
            tenant: tenantContext.tenant,
            window: tenantContext.window,
            catalog: tenantContext.catalog,
            inventory: tenantContext.inventory,
            sales: tenantContext.sales,
            slowMovers: tenantContext.slowMovers,
          }),
          '\nDashboard (mes actual):',
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
          '\nInstrucciones: responde de forma concreta y basada en los datos anteriores (SKU/variante cuando aplique).',
        ].join('\n'),
      },
    ];

    const result = await this.openRouter.chat({
      model: this.defaultModel(),
      messages,
      temperature: 0.3,
      maxTokens: 900,
    });

    return {
      model: this.defaultModel(),
      usage: result.usage,
      answer: result.content,
    };
  }
}
