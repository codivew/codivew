import type { VNode } from 'preact';
import type { ReviewRenderContext } from '../reviews/types/review-renderer.js';
import { parseUnifiedDiff } from '../reviews/unified-diff.js';
import { IssueSections } from './components/issue-sections.js';
import { ReportFooter } from './components/report-footer.js';
import { ReportHeader } from './components/report-header.js';
import { ReportOverview } from './components/report-overview.js';
import { ReviewDiff } from './components/review-diff.js';
import { REPORT_STYLE } from './report-style.generated.js';

type ReviewReportProps = {
  context: ReviewRenderContext;
};

export function ReviewReport({ context }: ReviewReportProps): VNode {
  const parsedDiff = parseUnifiedDiff(context.filtered.diff);
  const title = `Codivew - ${context.request.repository} - ${context.reviewId}`;

  return (
    <html lang="ko">
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
          <IssueSections issues={context.result.issues} files={parsedDiff} />
          <ReviewDiff files={parsedDiff} issues={context.result.issues} />
          <ReportFooter context={context} />
        </main>
      </body>
    </html>
  );
}
