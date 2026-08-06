import { basename } from 'node:path';
import {
  DEFAULT_MAX_DIFF_CHARS,
  DEFAULT_API_TIMEOUT_MS,
  DEFAULT_API_URL,
  DEFAULT_MODEL,
  type Authentication,
} from './config/runtime-config.js';
import { createGitReviewInput } from './git/git.js';
import type { Language } from './config/language.js';
import { HtmlRendererService } from './reporting/html-renderer.service.js';
import { DiffFilterService } from './reviews/diff-filter.service.js';
import { OpenAICompatibleService } from './reviews/openai-compatible.service.js';
import { ReviewPromptService } from './reviews/review-prompt.service.js';
import { ReviewsService, type GeneratedReview } from './reviews/reviews.service.js';
import { ReviewMode, type ReviewRequest } from './reviews/types/review-request.js';

export type ReviewProgressStage = 'collecting-diff' | 'generating-review' | 'completed';

export type RunReviewOptions = {
  cwd: string;
  locale?: Language;
  mode?: ReviewMode;
  baseBranch?: string;
  projectContext?: string[];
  apiUrl?: string;
  model?: string;
  authentication?: Authentication;
  timeoutMs?: number;
  maxDiffChars?: number;
  signal?: AbortSignal;
  onProgress?: (stage: ReviewProgressStage) => void;
};

export type RunReviewResult = GeneratedReview & {
  repositoryRoot: string;
  request: Omit<ReviewRequest, 'diff'>;
};

export async function runReview(options: RunReviewOptions): Promise<RunReviewResult> {
  const mode = options.mode ?? ReviewMode.WORKING;
  const baseBranch = options.baseBranch ?? 'main';
  options.onProgress?.('collecting-diff');
  const gitInput = await createGitReviewInput(options.cwd, {
    mode,
    baseBranch,
    signal: options.signal,
  });
  const request: ReviewRequest = {
    repository: basename(gitInput.repositoryRoot),
    ...(options.locale === undefined ? {} : { locale: options.locale }),
    baseBranch: mode === ReviewMode.BRANCH ? baseBranch : undefined,
    mode,
    commitSha: gitInput.commitSha,
    projectContext:
      options.projectContext === undefined || options.projectContext.length === 0
        ? undefined
        : options.projectContext,
    diff: gitInput.diff,
  };

  options.onProgress?.('generating-review');
  const reviews = new ReviewsService(
    options.maxDiffChars ?? DEFAULT_MAX_DIFF_CHARS,
    new DiffFilterService(),
    new ReviewPromptService(),
    new OpenAICompatibleService({
      baseUrl: options.apiUrl ?? DEFAULT_API_URL,
      model: options.model ?? DEFAULT_MODEL,
      authentication: options.authentication,
      timeoutMs: options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS,
      signal: options.signal,
    }),
    new HtmlRendererService(),
  );
  const generated = await reviews.createReview(request);
  options.onProgress?.('completed');

  return {
    ...generated,
    repositoryRoot: gitInput.repositoryRoot,
    request: generated.json.request,
  };
}
