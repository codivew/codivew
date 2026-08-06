import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import type { Authentication } from '../config/runtime-config.js';
import { t } from '../config/language.js';
import { reviewResultJsonSchema } from './schemas/review-result.schema.js';
import type { ReviewPrompts } from './review-prompt.service.js';

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: unknown } }>;
};

export type OpenAICompatibleOptions = {
  baseUrl: string;
  model: string;
  authentication?: Authentication;
  timeoutMs: number;
  signal?: AbortSignal;
};

export class OpenAICompatibleService {
  private readonly baseUrl: string;
  readonly model: string;

  constructor(private readonly options: OpenAICompatibleOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.model = options.model;
  }

  async generateReview(prompts: ReviewPrompts): Promise<unknown> {
    const callerCancelled = (): boolean => this.options.signal?.aborted ?? false;
    if (callerCancelled()) {
      throw new ReviewError(ERROR_CODES.CANCELLED, t('review.cancelled'));
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
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...authenticationHeaders(this.options.authentication ?? { type: 'none' }),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: prompts.system },
            { role: 'user', content: prompts.user },
          ],
          temperature: 0.1,
          response_format: {
            type: 'json_schema',
            json_schema: { name: 'codivew_review', schema: reviewResultJsonSchema },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ReviewError(
          ERROR_CODES.AI_PROVIDER_UNAVAILABLE,
          t('provider.requestFailed', { status: response.status }),
        );
      }

      let body: ChatCompletionResponse;
      try {
        body = (await response.json()) as ChatCompletionResponse;
      } catch {
        throw this.invalidResponse();
      }

      const content = body.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw this.invalidResponse();

      try {
        return JSON.parse(content) as unknown;
      } catch {
        throw this.invalidResponse();
      }
    } catch (error) {
      if (error instanceof ReviewError) throw error;
      if (callerCancelled()) {
        throw new ReviewError(ERROR_CODES.CANCELLED, t('review.cancelled'), error);
      }
      const message = timedOut
        ? t('provider.timeout', { timeout: this.options.timeoutMs })
        : t('provider.connectFailed', { url: this.baseUrl });
      throw new ReviewError(ERROR_CODES.AI_PROVIDER_UNAVAILABLE, message, error);
    } finally {
      clearTimeout(timeout);
      this.options.signal?.removeEventListener('abort', abortFromCaller);
    }
  }

  private invalidResponse(): ReviewError {
    return new ReviewError(ERROR_CODES.MODEL_RESPONSE_INVALID, t('provider.invalidJson'));
  }
}

export function authenticationHeaders(authentication: Authentication): Record<string, string> {
  if (authentication.type === 'api-key') {
    return { authorization: `Bearer ${authentication.apiKey}` };
  }
  if (authentication.type === 'basic') {
    const credentials = Buffer.from(
      `${authentication.username}:${authentication.password}`,
      'utf8',
    ).toString('base64');
    return { authorization: `Basic ${credentials}` };
  }
  return {};
}
