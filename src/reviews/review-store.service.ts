import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const MAX_STORED_REVIEWS = 1_000;

@Injectable()
export class ReviewStoreService {
  private readonly reviews = new Map<string, { html: string; expiresAt: number }>();

  constructor(private readonly config: ConfigService) {}

  set(reviewId: string, html: string): void {
    this.removeExpired();
    this.reviews.set(reviewId, {
      html,
      expiresAt: Date.now() + this.config.getOrThrow<number>('review.resultTtlMs'),
    });
    if (this.reviews.size > MAX_STORED_REVIEWS) {
      const oldestReviewId = this.reviews.keys().next().value;
      if (oldestReviewId !== undefined) this.reviews.delete(oldestReviewId);
    }
  }

  get(reviewId: string): string | undefined {
    const review = this.reviews.get(reviewId);
    if (review === undefined) return undefined;
    if (review.expiresAt <= Date.now()) {
      this.reviews.delete(reviewId);
      return undefined;
    }
    return review.html;
  }

  private removeExpired(): void {
    const now = Date.now();
    for (const [reviewId, review] of this.reviews) {
      if (review.expiresAt <= now) this.reviews.delete(reviewId);
    }
  }
}
