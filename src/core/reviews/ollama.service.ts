import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { reviewResultJsonSchema } from './schemas/review-result.schema.js';
import type { ReviewPrompts } from './review-prompt.service.js';

type OllamaChatResponse = { message?: { content?: unknown } };

export type OllamaOptions = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
  signal?: AbortSignal;
};

export class OllamaService {
  private readonly baseUrl: string;
  readonly model: string;

  constructor(private readonly options: OllamaOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.model = options.model;
  }

  async generateReview(prompts: ReviewPrompts): Promise<unknown> {
    const callerCancelled = (): boolean => this.options.signal?.aborted ?? false;
    if (callerCancelled()) {
      throw new ReviewError(ERROR_CODES.CANCELLED, '리뷰가 취소되었습니다.');
    }
    const controller = new AbortController();
    let timedOut = false;
    const abortFromCaller = (): void => controller.abort();
    this.options.signal?.addEventListener('abort', abortFromCaller, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.options.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
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
        throw new ReviewError(
          ERROR_CODES.OLLAMA_UNAVAILABLE,
          `Ollama 요청에 실패했습니다. (HTTP ${response.status})`,
        );
      }

      let body: OllamaChatResponse;
      try {
        body = (await response.json()) as OllamaChatResponse;
      } catch {
        throw this.invalidResponse();
      }

      if (typeof body.message?.content !== 'string') throw this.invalidResponse();

      try {
        return JSON.parse(body.message.content) as unknown;
      } catch {
        throw this.invalidResponse();
      }
    } catch (error) {
      if (error instanceof ReviewError) throw error;
      if (callerCancelled()) {
        throw new ReviewError(ERROR_CODES.CANCELLED, '리뷰가 취소되었습니다.', error);
      }
      const message = timedOut
        ? `Ollama 응답 시간이 ${this.options.timeoutMs}ms를 초과했습니다.`
        : `Ollama에 연결할 수 없습니다: ${this.baseUrl}`;
      throw new ReviewError(ERROR_CODES.OLLAMA_UNAVAILABLE, message, error);
    } finally {
      clearTimeout(timeout);
      this.options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  private invalidResponse(): ReviewError {
    return new ReviewError(
      ERROR_CODES.MODEL_RESPONSE_INVALID,
      'Ollama가 올바른 JSON 리뷰 결과를 반환하지 않았습니다.',
    );
  }
}
