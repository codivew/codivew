import { renderToString } from 'preact-render-to-string';
import type { ReviewRenderContext, ReviewRenderer } from '../reviews/types/review-renderer.js';
import { parseUnifiedDiff } from '../reviews/unified-diff.js';
import { ReviewReport } from './review-report.js';
import { highlightDiff } from './syntax-highlighter.js';

export type { ReviewRenderContext } from '../reviews/types/review-renderer.js';

export class HtmlRendererService implements ReviewRenderer {
  async render(context: ReviewRenderContext): Promise<string> {
    const files = parseUnifiedDiff(context.filtered.diff);
    const highlightedLines = await highlightDiff(files);
    return `<!doctype html>${renderToString(
      <ReviewReport context={context} files={files} highlightedLines={highlightedLines} />,
    )}`;
  }
}
