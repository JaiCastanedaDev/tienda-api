import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import type { OpenRouterChatResponse, OpenRouterMessage } from './ai.types';

type AxiosErrorLike = {
  response?: {
    status?: number;
    data?: unknown;
  };
};

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);

  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  async chat(params: {
    model: string;
    messages: OpenRouterMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<{ content: string; usage?: OpenRouterChatResponse['usage'] }> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException(
        'OPENROUTER_API_KEY no está configurada',
      );
    }

    const startedAt = Date.now();

    try {
      const res = await axios.post<OpenRouterChatResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: params.model,
          messages: params.messages,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxTokens ?? 1200,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            // Recomendado por OpenRouter (metadatos, ayudan a trazabilidad)
            'HTTP-Referer':
              process.env.OPENROUTER_HTTP_REFERER ?? 'http://localhost',
            'X-Title': process.env.OPENROUTER_APP_NAME ?? 'tienda-api',
          },
          timeout: 30_000,
        },
      );

      const content = res.data.choices?.[0]?.message?.content ?? '';
      this.logger.log(
        `OpenRouter OK (${params.model}) en ${Date.now() - startedAt}ms; tokens=${res.data.usage?.total_tokens ?? 'n/a'}`,
      );

      return { content, usage: res.data.usage };
    } catch (e: unknown) {
      const err = e as AxiosErrorLike;
      const status = err.response?.status;
      const data = err.response?.data;
      this.logger.error(
        `OpenRouter error status=${status ?? 'n/a'} data=${
          data ? JSON.stringify(data) : 'n/a'
        }`,
      );
      throw new InternalServerErrorException(
        'Error al comunicar con OpenRouter',
      );
    }
  }
}
