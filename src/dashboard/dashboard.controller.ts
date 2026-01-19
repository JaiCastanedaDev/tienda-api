import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @Roles('OWNER', 'SELLER')
  async getMetrics(@CurrentUser() user: UserPayload) {
    return this.dashboardService.getMetrics(user.tenantId);
  }

  @Get('inventory-summary')
  @Roles('OWNER')
  async getInventorySummary(@CurrentUser() user: UserPayload) {
    return this.dashboardService.getInventorySummary(user.tenantId);
  }
}
