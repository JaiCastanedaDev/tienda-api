import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiInsightsDto } from './dto/ai-insights.dto';

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('models')
  @Roles('OWNER', 'SELLER')
  getModels() {
    return {
      default: process.env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini',
      note: 'Configura OPENROUTER_MODEL para cambiar el modelo. Ej: anthropic/claude-3.5-sonnet',
    };
  }

  @Post('insights')
  @Roles('OWNER')
  async insights(@CurrentUser() user: UserPayload, @Body() dto: AiInsightsDto) {
    return this.aiService.getInsights({
      tenantId: user.tenantId,
      days: dto.days ?? 30,
    });
  }

  @Post('chat')
  @Roles('OWNER', 'SELLER')
  async chat(@CurrentUser() user: UserPayload, @Body() dto: AiChatDto) {
    const safeDto = dto;
    return this.aiService.chat({
      tenantId: user.tenantId,
      message: safeDto.message,
      context: safeDto.context,
    });
  }
}
