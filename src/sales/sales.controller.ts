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
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.createSale(dto);
  }

  @Get()
  @Roles('OWNER', 'SELLER')
  findAll(@CurrentUser() user: UserPayload) {
    // Aquí puedes implementar el método en el servicio para listar ventas
    return { message: 'Lista de ventas', userId: user.id };
  }
}
