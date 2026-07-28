import { randomBytes } from 'node:crypto';
import { ZodError } from 'zod';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { DiffFilterService } from './diff-filter.service.js';
import { HtmlRendererService } from './html-renderer.service.js';
import { OllamaService } from './ollama.service.js';
import { ReviewPromptService } from './review-prompt.service.js';
import { parseReviewResult } from './schemas/review-result.schema.js';
import type { ReviewResult } from './types/review-result.js';
import type { ReviewRequest } from './types/review-request.js';

export type GeneratedReview = {
  reviewId: string;
  verdict: ReviewResult['verdict'];
  issueCount: number;
  reviewedFileCount: number;
  elapsedMs: number;
  html: string;
};

export class ReviewsService {
  constructor(
    private readonly maxDiffChars: number,
    private readonly diffFilter: DiffFilterService,
    private readonly prompt: ReviewPromptService,
    private readonly ollama: OllamaService,
    private readonly renderer: HtmlRendererService,
  ) {}

  async createReview(request: ReviewRequest): Promise<GeneratedReview> {
    const startedAt = Date.now();
    const reviewId = randomBytes(9).toString('base64url');
    const filtered = this.diffFilter.filter(request.diff);

    if (filtered.filteredCharCount > this.maxDiffChars) {
      throw new ReviewError(
        ERROR_CODES.DIFF_TOO_LARGE,
        `필터링된 Diff가 최대 크기 ${this.maxDiffChars}자를 초과했습니다.`,
      );
    }

    const result = await this.generateResult(request, filtered);
    const elapsedMs = Date.now() - startedAt;
    const html = this.renderer.render({
      reviewId,
      createdAt: new Date(),
      elapsedMs,
      model: this.ollama.model,
      request,
      filtered,
      result,
    });

    return {
      reviewId,
      verdict: result.verdict,
      issueCount: result.issues.length,
      reviewedFileCount: filtered.reviewedFiles.length,
      elapsedMs,
      html,
    };
  }

  private async generateResult(
    request: ReviewRequest,
    filtered: ReturnType<DiffFilterService['filter']>,
  ): Promise<ReviewResult> {
    try {
      const response = await this.ollama.generateReview(this.prompt.build(request, filtered));
      return parseReviewResult(response, filtered.reviewedFiles, filtered.diff);
    } catch (error) {
      if (!this.isModelInvalid(error)) throw error;
      const response = await this.ollama.generateReview(
        this.prompt.buildRetry(request, filtered, this.validationReason(error)),
      );
      try {
        return parseReviewResult(response, filtered.reviewedFiles, filtered.diff);
      } catch (retryError) {
        if (!this.isModelInvalid(retryError)) throw retryError;
        throw new ReviewError(
          ERROR_CODES.MODEL_RESPONSE_INVALID,
          '두 번의 시도에서 모두 모델 응답 검증에 실패했습니다.',
          retryError,
        );
      }
    }
  }

  private isModelInvalid(error: unknown): boolean {
    return (
      error instanceof ZodError ||
      (error instanceof ReviewError && error.code === ERROR_CODES.MODEL_RESPONSE_INVALID)
    );
  }

  private validationReason(error: unknown): string {
    if (error instanceof ZodError) {
      return error.issues
        .slice(0, 5)
        .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
        .join('; ');
    }
    return '응답이 유효한 JSON이 아니거나 필수 필드가 없습니다.';
  }
}
