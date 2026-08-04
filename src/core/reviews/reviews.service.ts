import { randomBytes } from 'node:crypto';
import { ZodError } from 'zod';
import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';
import { getLanguage, t, type Language } from '../config/language.js';
import { DiffFilterService } from './diff-filter.service.js';
import { OllamaService } from './ollama.service.js';
import { ReviewPromptService } from './review-prompt.service.js';
import { parseReviewResult } from './schemas/review-result.schema.js';
import type { ReviewResult } from './types/review-result.js';
import type { ReviewRequest } from './types/review-request.js';
import type { ReviewRenderer } from './types/review-renderer.js';

export type GeneratedReview = {
  reviewId: string;
  verdict: ReviewResult['verdict'];
  issueCount: number;
  reviewedFileCount: number;
  elapsedMs: number;
  html: string;
  json: ReviewJsonReport;
};

export type ReviewJsonReport = {
  schemaVersion: 1;
  reviewId: string;
  createdAt: string;
  elapsedMs: number;
  model: string;
  language: Language;
  request: Omit<ReviewRequest, 'diff'>;
  files: {
    reviewed: string[];
    originalCount: number;
    excludedCount: number;
  };
  result: ReviewResult;
};

export class ReviewsService {
  constructor(
    private readonly maxDiffChars: number,
    private readonly diffFilter: DiffFilterService,
    private readonly prompt: ReviewPromptService,
    private readonly ollama: OllamaService,
    private readonly renderer: ReviewRenderer,
  ) {}

  async createReview(request: ReviewRequest): Promise<GeneratedReview> {
    const startedAt = Date.now();
    const reviewId = randomBytes(9).toString('base64url');
    const filtered = this.diffFilter.filter(request.diff);

    if (filtered.filteredCharCount > this.maxDiffChars) {
      throw new ReviewError(
        ERROR_CODES.DIFF_TOO_LARGE,
        t('review.diffTooLarge', {
          max: this.maxDiffChars,
          current: filtered.filteredCharCount,
        }),
      );
    }

    const result = await this.generateResult(request, filtered);
    const elapsedMs = Date.now() - startedAt;
    const createdAt = new Date();
    const context = {
      reviewId,
      createdAt,
      elapsedMs,
      model: this.ollama.model,
      request,
      filtered,
      result,
    };
    const html = this.renderer.render(context);
    const locale = request.locale ?? getLanguage();
    const jsonRequest: Omit<ReviewRequest, 'diff'> = {
      repository: request.repository,
      locale,
      mode: request.mode,
      ...(request.baseBranch === undefined ? {} : { baseBranch: request.baseBranch }),
      ...(request.commitSha === undefined ? {} : { commitSha: request.commitSha }),
      ...(request.projectContext === undefined ? {} : { projectContext: request.projectContext }),
    };
    const json: ReviewJsonReport = {
      schemaVersion: 1,
      reviewId,
      createdAt: createdAt.toISOString(),
      elapsedMs,
      model: this.ollama.model,
      language: locale,
      request: jsonRequest,
      files: {
        reviewed: filtered.reviewedFiles,
        originalCount: filtered.originalFileCount,
        excludedCount: filtered.filteredFileCount,
      },
      result,
    };

    return {
      reviewId,
      verdict: result.verdict,
      issueCount: result.issues.length,
      reviewedFileCount: filtered.reviewedFiles.length,
      elapsedMs,
      html,
      json,
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
          t('review.validationFailedTwice'),
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
    return t('review.invalidResponse');
  }
}
