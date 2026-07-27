import { ConfigService } from '@nestjs/config';
import { ApiException } from '../common/errors/api-exception';
import { ReviewMode, type CreateReviewDto } from './dto/create-review.dto';
import { DiffFilterService } from './diff-filter.service';
import { HtmlRendererService } from './html-renderer.service';
import { OllamaService } from './ollama.service';
import { ReviewPromptService } from './review-prompt.service';
import { ReviewStoreService } from './review-store.service';
import { ReviewsService } from './reviews.service';

const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@
-old
+new`;
const dto: CreateReviewDto = { repository: 'repo', mode: ReviewMode.STAGED, diff };
const valid = { verdict: 'approve', risk: 'low', summary: '좋습니다.', issues: [], tests: [] };

describe('ReviewsService', () => {
  const renderer = { render: jest.fn().mockReturnValue('<html></html>') };
  const ollama = { model: 'qwen', generateReview: jest.fn() };
  const create = (maxDiffChars = 10000): ReviewsService =>
    new ReviewsService(
      new ConfigService({
        review: { maxDiffChars, resultTtlMs: 86_400_000 },
        app: { publicUrl: 'https://reviews.test/result' },
      }),
      new DiffFilterService(),
      new ReviewPromptService(),
      ollama as unknown as OllamaService,
      renderer as unknown as HtmlRendererService,
      new ReviewStoreService(new ConfigService({ review: { resultTtlMs: 86_400_000 } })),
    );

  beforeEach(() => jest.clearAllMocks());

  it('generates a short public review URL', async () => {
    ollama.generateReview.mockResolvedValue(valid);
    const result = await create().createReview(dto);
    expect(result.reviewId).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(result.publicUrl).toMatch(/^https:\/\/reviews\.test\/result\/[A-Za-z0-9_-]{12}$/);
    expect(renderer.render).toHaveBeenCalledTimes(1);
  });

  it('rejects an entirely filtered diff', async () => {
    await expect(
      create().createReview({ ...dto, diff: diff.replaceAll('src/app.ts', 'pnpm-lock.yaml') }),
    ).rejects.toBeInstanceOf(ApiException);
  });

  it('rejects an oversized filtered diff', async () => {
    await expect(create(10).createReview(dto)).rejects.toBeInstanceOf(ApiException);
  });

  it('retries once after validation failure', async () => {
    ollama.generateReview.mockResolvedValueOnce({ invalid: true }).mockResolvedValueOnce(valid);
    await expect(create().createReview(dto)).resolves.toMatchObject({ verdict: 'approve' });
    expect(ollama.generateReview).toHaveBeenCalledTimes(2);
  });

  it('fails when both model responses are invalid', async () => {
    ollama.generateReview.mockResolvedValue({ invalid: true });
    await expect(create().createReview(dto)).rejects.toBeInstanceOf(ApiException);
    expect(ollama.generateReview).toHaveBeenCalledTimes(2);
  });
});
