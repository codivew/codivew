import { t } from '../config/language.js';
import type { FilteredDiffResult } from './diff-filter.service.js';
import type { ReviewRequest } from './types/review-request.js';

export type ReviewPrompts = { system: string; user: string };

export class ReviewPromptService {
  build(dto: ReviewRequest, filtered: FilteredDiffResult): ReviewPrompts {
    const none = t('prompt.none');
    return {
      system: t('prompt.system'),
      user: t('prompt.user', {
        repository: dto.repository,
        baseBranch: dto.baseBranch ?? none,
        mode: dto.mode,
        commitSha: dto.commitSha ?? none,
        projectContext: dto.projectContext?.map((item) => `- ${item}`).join('\n') ?? none,
        reviewedFiles: filtered.reviewedFiles.map((file) => `- ${file}`).join('\n'),
        diff: filtered.diff,
      }),
    };
  }

  buildRetry(dto: ReviewRequest, filtered: FilteredDiffResult, reason: string): ReviewPrompts {
    const prompts = this.build(dto, filtered);
    return {
      system: prompts.system,
      user: `${prompts.user}\n\n${t('review.retryPrompt', { reason })}`,
    };
  }
}
