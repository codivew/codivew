import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodError } from 'zod';
import { ERROR_CODES } from '../common/constants/error-codes';
import { ApiException } from '../common/errors/api-exception';
import type { CreateReviewDto } from './dto/create-review.dto';
import { DiffFilterService } from './diff-filter.service';
import { HtmlRendererService } from './html-renderer.service';
import { OllamaService } from './ollama.service';
import { ReviewPromptService } from './review-prompt.service';
import { ReviewStoreService } from './review-store.service';
import { parseReviewResult } from './schemas/review-result.schema';
import type { ReviewResult } from './types/review-result';

export type GeneratedReview = {
  reviewId: string;
  filename: string;
  html: string;
  verdict: ReviewResult['verdict'];
  issueCount: number;
  publicUrl: string;
};

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly diffFilter: DiffFilterService,
    private readonly prompt: ReviewPromptService,
    private readonly ollama: OllamaService,
    private readonly renderer: HtmlRendererService,
    private readonly store: ReviewStoreService,
  ) {}

  async createReview(dto: CreateReviewDto): Promise<GeneratedReview> {
    const startedAt = Date.now();
    const reviewId = randomUUID();
    const filtered = this.diffFilter.filter(dto.diff);
    if (filtered.filteredCharCount > this.config.getOrThrow<number>('review.maxDiffChars')) {
      throw new ApiException(
        HttpStatus.PAYLOAD_TOO_LARGE,
        ERROR_CODES.DIFF_TOO_LARGE,
        'Diff가 리뷰 가능한 최대 크기를 초과했습니다.',
      );
    }

    let result: ReviewResult;
    try {
      const response = await this.ollama.generateReview(this.prompt.build(dto, filtered));
      result = parseReviewResult(response, filtered.reviewedFiles);
    } catch (error) {
      if (!(error instanceof ZodError) && !this.isModelInvalid(error)) throw error;
      const reason = this.validationReason(error);
      try {
        const response = await this.ollama.generateReview(
          this.prompt.buildRetry(dto, filtered, reason),
        );
        result = parseReviewResult(response, filtered.reviewedFiles);
      } catch (retryError) {
        if (!(retryError instanceof ZodError) && !this.isModelInvalid(retryError)) throw retryError;
        throw new ApiException(
          HttpStatus.BAD_GATEWAY,
          ERROR_CODES.MODEL_RESPONSE_INVALID,
          '모델 응답 형식이 올바르지 않습니다.',
        );
      }
    }

    const elapsedMs = Date.now() - startedAt;
    const filename = `${reviewId}.html`;
    const publicUrl = `${this.config.getOrThrow<string>('app.publicUrl')}/${filename}`;
    const html = this.renderer.render({
      reviewId,
      createdAt: new Date(),
      elapsedMs,
      model: this.ollama.model,
      publicUrl,
      request: dto,
      filtered,
      result,
    });
    this.store.set(reviewId, html);
    this.logger.log({
      reviewId,
      repository: dto.repository,
      mode: dto.mode,
      model: this.ollama.model,
      originalFileCount: filtered.originalFileCount,
      reviewedFileCount: filtered.reviewedFiles.length,
      originalCharCount: filtered.originalCharCount,
      filteredCharCount: filtered.filteredCharCount,
      elapsedMs,
      verdict: result.verdict,
      issueCount: result.issues.length,
    });
    return {
      reviewId,
      filename,
      html,
      verdict: result.verdict,
      issueCount: result.issues.length,
      publicUrl,
    };
  }

  private isModelInvalid(error: unknown): boolean {
    return (
      error instanceof ApiException &&
      (error.getResponse() as { error?: { code?: string } }).error?.code ===
        ERROR_CODES.MODEL_RESPONSE_INVALID
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
