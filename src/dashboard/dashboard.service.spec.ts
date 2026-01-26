import { DashboardService } from './dashboard.service';
import type { PrismaService } from '../prisma/prisma.service';

describe('DashboardService (date range)', () => {
  it('calcula period en UTC y respeta year>=2025 (contrato)', async () => {
    // No tocamos DB aquí; solo verificamos que el servicio use UTC generando un period consistente.
    // Mock mínimo del prisma para evitar llamadas.
    const prismaMock = {
      sale: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      saleItem: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      stock: {
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaService;

    const service = new DashboardService(prismaMock);

    const res = await service.getMetrics('t1', { month: 12, year: 2025 });

    expect(res.period).toBeDefined();
    expect(res.period?.month).toBe(12);
    expect(res.period?.year).toBe(2025);
    expect(res.period?.from).toBe('2025-12-01T00:00:00.000Z');
    expect(res.period?.to).toBe('2025-12-31T23:59:59.999Z');
  });
});
