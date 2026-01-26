import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
import { DashboardMetricsQueryDto } from './dto/dashboard-metrics-query.dto';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: { getMetrics: jest.Mock };

  beforeEach(async () => {
    service = {
      getMetrics: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    }).compile();

    controller = module.get(DashboardController);
  });

  it('pasa month/year al servicio cuando vienen en query', async () => {
    const user = { tenantId: 't1' } as unknown as UserPayload;
    const query = { month: 12, year: 2025 } as DashboardMetricsQueryDto;

    await controller.getMetrics(user, query);

    expect(service.getMetrics).toHaveBeenCalledWith('t1', {
      month: 12,
      year: 2025,
    });
  });

  it('mantiene compatibilidad cuando no hay query', async () => {
    const user = { tenantId: 't1' } as unknown as UserPayload;
    const query = {} as DashboardMetricsQueryDto;

    await controller.getMetrics(user, query);

    expect(service.getMetrics).toHaveBeenCalledWith('t1');
  });
});
