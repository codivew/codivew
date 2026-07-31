import { renderToString } from 'preact-render-to-string';
import type { ReviewRenderContext, ReviewRenderer } from '../reviews/types/review-renderer.js';
import { ReviewReport } from './review-report.js';

export type { ReviewRenderContext } from '../reviews/types/review-renderer.js';

export class HtmlRendererService implements ReviewRenderer {
  render(context: ReviewRenderContext): string {
    return `<!doctype html>${renderToString(<ReviewReport context={context} />)}`;
  }
}
