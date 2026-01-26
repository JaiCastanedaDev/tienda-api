import {
  Injectable,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import axios from 'axios';
import type { OpenRouterChatResponse, OpenRouterMessage } from './ai.types';

type AxiosErrorLike = {
  response?: {
    status?: number;
    data?: unknown;
    headers?: Record<string, unknown>;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(headers?: Record<string, unknown>): number | null {
  const retryAfter = headers?.['retry-after'];
  if (typeof retryAfter === 'string') {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds) && seconds > 0) return seconds * 1000;
  }
  return null;
}

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

    const fallbackModels = (process.env.OPENROUTER_FALLBACK_MODELS ?? '')
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);

    const modelsToTry = [params.model, ...fallbackModels];

    const maxAttempts = Number(process.env.OPENROUTER_MAX_RETRIES ?? '2');
    const baseDelayMs = Number(process.env.OPENROUTER_RETRY_DELAY_MS ?? '400');

    for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
      const model = modelsToTry[modelIndex];

      for (let attempt = 0; attempt <= maxAttempts; attempt++) {
        try {
          const res = await axios.post<OpenRouterChatResponse>(
            `${this.baseUrl}/chat/completions`,
            {
              model,
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
            `OpenRouter OK (${model}) en ${Date.now() - startedAt}ms; tokens=${res.data.usage?.total_tokens ?? 'n/a'}`,
          );

          return { content, usage: res.data.usage };
        } catch (e: unknown) {
          const err = e as AxiosErrorLike;
          const status = err.response?.status;
          const data = err.response?.data;
          const retryAfterMs = parseRetryAfterMs(err.response?.headers);

          // 429: rate-limited. Reintentar con backoff; si se agotan intentos cambia de modelo.
          if (status === 429) {
            const isLastAttempt = attempt >= maxAttempts;
            const isLastModel = modelIndex >= modelsToTry.length - 1;

            this.logger.warn(
              `OpenRouter 429 (${model}). attempt=${attempt + 1}/${maxAttempts + 1} ` +
                `model=${modelIndex + 1}/${modelsToTry.length} ` +
                `retryAfterMs=${retryAfterMs ?? 'n/a'} data=${data ? JSON.stringify(data) : 'n/a'}`,
            );

            if (isLastAttempt) {
              if (isLastModel) {
                throw new HttpException(
                  'La IA está temporalmente limitada (rate limit). Intenta de nuevo en unos segundos o usa BYOK.',
                  HttpStatus.TOO_MANY_REQUESTS,
                );
              }
              break; // cambiar al siguiente modelo
            }

            const delay =
              retryAfterMs ??
              baseDelayMs * Math.pow(2, attempt) +
                Math.floor(Math.random() * 120);
            await sleep(delay);
            continue;
          }

          // 503/504: proveedor o upstream inestable
          if (status === 503 || status === 504) {
            this.logger.warn(
              `OpenRouter ${status} (${model}) data=${data ? JSON.stringify(data) : 'n/a'}`,
            );
            throw new ServiceUnavailableException(
              'La IA no está disponible temporalmente. Intenta de nuevo.',
            );
          }

          this.logger.error(
            `OpenRouter error status=${status ?? 'n/a'} data=${data ? JSON.stringify(data) : 'n/a'}`,
          );
          throw new InternalServerErrorException(
            'Error al comunicar con OpenRouter',
          );
        }
      }
    }

    // fallback defensivo
    throw new HttpException(
      'La IA está temporalmente limitada (rate limit). Intenta de nuevo.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
