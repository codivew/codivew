import { jest } from '@jest/globals';
import { ReviewError } from '../common/errors/review-error.js';
import { DiffFilterService } from './diff-filter.service.js';
import { OllamaService } from './ollama.service.js';
import { ReviewPromptService } from './review-prompt.service.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewMode, type ReviewRequest } from './types/review-request.js';
import type { ReviewRenderer } from './types/review-renderer.js';

const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@
-old
+new`;
const request: ReviewRequest = { repository: 'repo', mode: ReviewMode.STAGED, diff };
const valid = { verdict: 'approve', risk: 'low', summary: '좋습니다.', issues: [], tests: [] };

describe('ReviewsService', () => {
  const renderer = {
    render: jest.fn<ReviewRenderer['render']>().mockReturnValue('<html></html>'),
  };
  const ollama = {
    model: 'qwen',
    generateReview: jest.fn<OllamaService['generateReview']>(),
  };
  const create = (maxDiffChars = 10_000): ReviewsService =>
    new ReviewsService(
      maxDiffChars,
      new DiffFilterService(),
      new ReviewPromptService(),
      ollama as unknown as OllamaService,
      renderer,
    );

  beforeEach(() => jest.clearAllMocks());

  it('generates a standalone HTML review', async () => {
    ollama.generateReview.mockResolvedValue(valid);
    const result = await create().createReview(request);
    expect(result.reviewId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(result).toMatchObject({ verdict: 'approve', issueCount: 0, html: '<html></html>' });
    expect(result.json).toMatchObject({
      schemaVersion: 1,
      model: 'qwen',
      language: 'ko-KR',
      request: { repository: 'repo', mode: ReviewMode.STAGED },
      files: { reviewed: ['src/app.ts'], originalCount: 1, excludedCount: 0 },
      result: valid,
    });
    expect(result.json.request).not.toHaveProperty('diff');
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it('rejects an entirely filtered diff', async () => {
    await expect(
      create().createReview({ ...request, diff: diff.replaceAll('src/app.ts', 'pnpm-lock.yaml') }),
    ).rejects.toBeInstanceOf(ReviewError);
  });

  it('rejects an oversized filtered diff', async () => {
    await expect(create(10).createReview(request)).rejects.toMatchObject({
      code: 'DIFF_TOO_LARGE',
    });
  });

  it('retries once after validation failure', async () => {
    ollama.generateReview.mockResolvedValueOnce({ invalid: true }).mockResolvedValueOnce(valid);
    await expect(create().createReview(request)).resolves.toMatchObject({ verdict: 'approve' });
    expect(ollama.generateReview).toHaveBeenCalledTimes(2);
  });

  it('fails when both model responses are invalid', async () => {
    ollama.generateReview.mockResolvedValue({ invalid: true });
    await expect(create().createReview(request)).rejects.toMatchObject({
      code: 'MODEL_RESPONSE_INVALID',
    });
    expect(ollama.generateReview).toHaveBeenCalledTimes(2);
  });
});
