import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '../common/constants/error-codes';
import { ApiException } from '../common/errors/api-exception';
import { reviewResultJsonSchema } from './schemas/review-result.schema';
import type { ReviewPrompts } from './review-prompt.service';

type OllamaChatResponse = { message?: { content?: unknown } };

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);

  constructor(private readonly config: ConfigService) {}

  get model(): string {
    return this.config.getOrThrow<string>('ollama.model');
  }

  async generateReview(prompts: ReviewPrompts): Promise<unknown> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.getOrThrow<number>('ollama.timeoutMs'),
    );
    try {
      const response = await fetch(`${this.config.getOrThrow<string>('ollama.baseUrl')}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
          format: reviewResultJsonSchema,
          options: { temperature: 0.1 },
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn({
          event: 'ollama_request_failed',
          reason: 'http_error',
          model: this.model,
          statusCode: response.status,
          elapsedMs: Date.now() - startedAt,
        });
        throw this.unavailable();
      }
      let body: OllamaChatResponse;
      try {
        body = (await response.json()) as OllamaChatResponse;
      } catch {
        this.logger.warn({
          event: 'ollama_request_failed',
          reason: 'response_body_read_failed',
          model: this.model,
          statusCode: response.status,
          elapsedMs: Date.now() - startedAt,
        });
        throw this.unavailable();
      }
      if (typeof body.message?.content !== 'string') {
        this.logInvalidModelResponse('message_content_missing', startedAt);
        throw new ApiException(
          HttpStatus.BAD_GATEWAY,
          ERROR_CODES.MODEL_RESPONSE_INVALID,
          '모델 응답 형식이 올바르지 않습니다.',
        );
      }
      try {
        const result = JSON.parse(body.message.content) as unknown;
        this.logger.log({
          event: 'ollama_request_completed',
          model: this.model,
          elapsedMs: Date.now() - startedAt,
        });
        return result;
      } catch {
        this.logInvalidModelResponse('message_content_not_json', startedAt);
        throw new ApiException(
          HttpStatus.BAD_GATEWAY,
          ERROR_CODES.MODEL_RESPONSE_INVALID,
          '모델 응답 형식이 올바르지 않습니다.',
        );
      }
    } catch (error) {
      if (error instanceof ApiException) throw error;
      this.logger.error({
        event: 'ollama_request_failed',
        reason: controller.signal.aborted ? 'timeout' : 'network_error',
        model: this.model,
        elapsedMs: Date.now() - startedAt,
      });
      throw this.unavailable();
    } finally {
      clearTimeout(timeout);
    }
  }

  async isReady(): Promise<boolean> {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.getOrThrow<number>('ollama.readyTimeoutMs'),
    );
    try {
      const response = await fetch(`${this.config.getOrThrow<string>('ollama.baseUrl')}/api/tags`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        this.logger.warn({
          event: 'ollama_readiness_failed',
          reason: 'http_error',
          statusCode: response.status,
          elapsedMs: Date.now() - startedAt,
        });
      }
      return response.ok;
    } catch {
      this.logger.warn({
        event: 'ollama_readiness_failed',
        reason: controller.signal.aborted ? 'timeout' : 'network_error',
        elapsedMs: Date.now() - startedAt,
      });
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private unavailable(): ApiException {
    return new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      ERROR_CODES.OLLAMA_UNAVAILABLE,
      'AI 리뷰 서비스에 연결할 수 없습니다.',
    );
  }

  private logInvalidModelResponse(reason: string, startedAt: number): void {
    this.logger.warn({
      event: 'ollama_model_response_invalid',
      reason,
      model: this.model,
      elapsedMs: Date.now() - startedAt,
    });
  }
}
