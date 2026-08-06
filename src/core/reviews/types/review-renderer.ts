import type { FilteredDiffResult } from '../diff-filter.service.js';
import type { ReviewRequest } from './review-request.js';
import type { ReviewResult } from './review-result.js';

export type ReviewRenderContext = {
  reviewId: string;
  createdAt: Date;
  elapsedMs: number;
  model: string;
  request: ReviewRequest;
  filtered: FilteredDiffResult;
  result: ReviewResult;
};

export interface ReviewRenderer {
  render(context: ReviewRenderContext): Promise<string>;
}
