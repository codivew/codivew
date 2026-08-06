import type { VNode } from 'preact';
import { getLanguage } from '../config/language.js';
import type { ReviewRenderContext } from '../reviews/types/review-renderer.js';
import type { ParsedDiffFile } from '../reviews/unified-diff.js';
import { IssueSections } from './components/issue-sections.js';
import { ReportFooter } from './components/report-footer.js';
import { ReportHeader } from './components/report-header.js';
import { ReportOverview } from './components/report-overview.js';
import { ReviewDiff } from './components/review-diff.js';
import { REPORT_STYLE } from './report-style.generated.js';
import type { HighlightedDiffLines } from './syntax-highlighter.js';

type ReviewReportProps = {
  context: ReviewRenderContext;
  files: ParsedDiffFile[];
  highlightedLines: HighlightedDiffLines;
};

export function ReviewReport({ context, files, highlightedLines }: ReviewReportProps): VNode {
  const title = `Codivew - ${context.request.repository} - ${context.reviewId}`;

  return (
    <html lang={getLanguage()}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="noindex,nofollow" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: REPORT_STYLE }} />
      </head>
      <body class="m-0 bg-[var(--bg)] font-sans text-[15px]/[1.65] text-[var(--text)] antialiased print:bg-white print:text-black">
        <main class="mx-auto max-w-[1180px] px-6 pt-8 pb-20 max-[700px]:px-3 max-[700px]:pt-3 max-[700px]:pb-10 print:max-w-none print:p-0">
          <ReportHeader context={context} />
          <ReportOverview context={context} />
          <IssueSections issues={context.result.issues} files={files} />
          <ReviewDiff
            files={files}
            issues={context.result.issues}
            highlightedLines={highlightedLines}
          />
          <ReportFooter context={context} />
        </main>
      </body>
    </html>
  );
}
