import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Roles('OWNER', 'SELLER')
  create(@CurrentUser() user: UserPayload, @Body() dto: CreateSaleDto) {
    return this.salesService.createSale(user.tenantId, user.id, dto);
  }

  @Get()
  @Roles('OWNER', 'SELLER')
  findAll(@CurrentUser() user: UserPayload) {
    return this.salesService.listSales(user.tenantId);
  }
}
