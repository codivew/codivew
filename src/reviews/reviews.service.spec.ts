import { ConfigService } from '@nestjs/config';
import { ApiException } from '../common/errors/api-exception';
import { ReviewMode, type CreateReviewDto } from './dto/create-review.dto';
import { DiffFilterService } from './diff-filter.service';
import { HtmlRendererService } from './html-renderer.service';
import { OllamaService } from './ollama.service';
import { ReviewPromptService } from './review-prompt.service';
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
      new ConfigService({ review: { maxDiffChars } }),
      new DiffFilterService(),
      new ReviewPromptService(),
      ollama as unknown as OllamaService,
      renderer as unknown as HtmlRendererService,
    );

  beforeEach(() => jest.clearAllMocks());

  it('generates a UUID HTML review', async () => {
    ollama.generateReview.mockResolvedValue(valid);
    const result = await create().createReview(dto);
    expect(result.filename).toMatch(/^[0-9a-f-]{36}\.html$/);
    expect(result.html).toBe('<html></html>');
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
