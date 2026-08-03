import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { t } from '../config/language.js';
import { reviewResultJsonSchema } from './schemas/review-result.schema.js';
import type { ReviewPrompts } from './review-prompt.service.js';

type OllamaChatResponse = { message?: { content?: unknown } };

export type OllamaOptions = {
  baseUrl: string;
  model: string;
  timeoutMs: number;
};

export class OllamaService {
  private readonly baseUrl: string;
  readonly model: string;

  constructor(private readonly options: OllamaOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.model = options.model;
  }

  async generateReview(prompts: ReviewPrompts): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs);

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
          t('ollama.requestFailed', { status: response.status }),
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
      const message = controller.signal.aborted
        ? t('ollama.timeout', { timeout: this.options.timeoutMs })
        : t('ollama.connectFailed', { url: this.baseUrl });
      throw new ReviewError(ERROR_CODES.OLLAMA_UNAVAILABLE, message, error);
    } finally {
      clearTimeout(timeout);
    }
  }

  private invalidResponse(): ReviewError {
    return new ReviewError(ERROR_CODES.MODEL_RESPONSE_INVALID, t('ollama.invalidJson'));
  }
}
