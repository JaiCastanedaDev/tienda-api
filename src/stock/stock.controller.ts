import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
import { StockService } from './stock.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SetStockDto } from './dto/set-stock.dto';

@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // Listado de stock por variante
  @Get()
  @Roles('OWNER', 'SELLER')
  async list(
    @CurrentUser() user: UserPayload,
    @Query('lowOnly') lowOnly?: string,
  ) {
    return this.stockService.listStock(user.tenantId, {
      lowOnly: lowOnly === 'true',
    });
  }

  // Ver stock de una variante específica
  @Get('variant')
  @Roles('OWNER', 'SELLER')
  async getVariant(
    @CurrentUser() user: UserPayload,
    @Query('productVariantId') productVariantId: string,
  ) {
    return this.stockService.getVariantStock(user.tenantId, productVariantId);
  }

  // Ver stock de una variante específica (por path param)
  @Get('variant/:productVariantId')
  @Roles('OWNER', 'SELLER')
  async getVariantByParam(
    @CurrentUser() user: UserPayload,
    @Param('productVariantId') productVariantId: string,
  ) {
    return this.stockService.getVariantStock(user.tenantId, productVariantId);
  }

  // Ajuste de stock (+/-)
  @Post('adjust')
  @Roles('OWNER')
  async adjust(@CurrentUser() user: UserPayload, @Body() dto: AdjustStockDto) {
    // Seguridad: forzamos tenantId desde el token
    return this.stockService.adjustStock({
      tenantId: user.tenantId,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
      reason: dto.reason,
    });
  }

  // Establecer cantidad exacta
  @Post('set')
  @Roles('OWNER')
  async set(@CurrentUser() user: UserPayload, @Body() dto: SetStockDto) {
    return this.stockService.setStock({
      tenantId: user.tenantId,
      productVariantId: dto.productVariantId,
      quantity: dto.quantity,
      reason: dto.reason,
    });
  }

  // Movimientos de stock
  @Get('movements')
  @Roles('OWNER')
  async movements(
    @CurrentUser() user: UserPayload,
    @Query('take') take?: string,
  ) {
    return this.stockService.listMovements(user.tenantId, {
      take: take ? Number(take) : undefined,
    });
  }
}
