import type { ComponentChildren, VNode } from 'preact';
import { t } from '../../config/language.js';
import type { ReviewRenderContext } from '../../reviews/types/review-renderer.js';
import type { ReviewResult } from '../../reviews/types/review-result.js';
import { formatDateTime } from './report-ui.js';

const VERDICT_BADGE_CLASSES: Record<ReviewResult['verdict'], string> = {
  approve: 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]',
  comment: 'border-[var(--should)] bg-[var(--should-soft)] text-[var(--should)]',
  request_changes: 'border-[var(--must)] bg-[var(--must-soft)] text-[var(--must)]',
};
const RISK_BADGE_CLASSES: Record<ReviewResult['risk'], string> = {
  low: 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]',
  medium: 'border-[var(--should)] bg-[var(--should-soft)] text-[var(--should)]',
  high: 'border-[var(--must)] bg-[var(--must-soft)] text-[var(--must)]',
};

export function ReportHeader({ context }: { context: ReviewRenderContext }): VNode {
  const { result, request, filtered } = context;
  const verdict = {
    approve: t('report.verdict.approve'),
    comment: t('report.verdict.comment'),
    request_changes: t('report.verdict.requestChanges'),
  }[result.verdict];
  const risk = {
    low: t('report.risk.low'),
    medium: t('report.risk.medium'),
    high: t('report.risk.high'),
  }[result.risk];
  const mode = {
    working: t('report.mode.working'),
    staged: t('report.mode.staged'),
    branch: t('report.mode.branch'),
  }[request.mode];

  return (
    <header class="mb-6 overflow-hidden rounded-[24px] border border-[var(--line)] bg-[linear-gradient(135deg,var(--panel),var(--accent-soft))] p-7 shadow-[var(--shadow-lg)] max-[700px]:rounded-2xl max-[700px]:p-5 print:shadow-none">
      <div class="flex items-start justify-between gap-8 max-[700px]:flex-col max-[700px]:gap-5">
        <div class="min-w-0">
          <div class="mb-4 flex items-center gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-sm font-black text-white shadow-sm">
              C
            </span>
            <div>
              <p class="text-[11px]/4 font-bold tracking-[0.16em] text-[var(--accent)] uppercase">
                Codivew Engine
              </p>
              <p class="text-xs text-[var(--muted)]">AI Code Review Report</p>
            </div>
          </div>
          <h1 class="mb-3 max-w-[760px] text-[32px]/[1.16] font-bold tracking-[-0.035em] text-[var(--text)] [overflow-wrap:anywhere] max-[700px]:text-[26px]/[1.2]">
            {request.repository}
          </h1>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-[var(--muted-strong)]">
            <span>{mode}</span>
            <span class="size-1 rounded-full bg-[var(--line-strong)]" />
            <span>{t('report.filesReviewed', { count: filtered.reviewedFiles.length })}</span>
            <span class="size-1 rounded-full bg-[var(--line-strong)]" />
            <span>{formatDateTime(context.createdAt)}</span>
          </div>
        </div>
        <div class="flex shrink-0 flex-wrap justify-end gap-2 max-[700px]:justify-start">
          <StatusBadge className={VERDICT_BADGE_CLASSES[result.verdict]}>
            <span class="size-1.5 rounded-full bg-current" />
            {verdict}
          </StatusBadge>
          <StatusBadge className={RISK_BADGE_CLASSES[result.risk]}>
            {t('report.riskLabel')} {risk}
          </StatusBadge>
        </div>
      </div>
      <nav class="mt-6 flex flex-wrap gap-2 border-t border-[var(--line)] pt-4 text-[13px] font-semibold">
        <NavLink href="#review-issues">{t('report.reviewItems')}</NavLink>
        <NavLink href="#changed-code">{t('report.changedCode')}</NavLink>
        <NavLink href="#recommended-tests">{t('report.recommendedTests')}</NavLink>
      </nav>
    </header>
  );
}

function StatusBadge({
  children,
  className,
}: {
  children: ComponentChildren;
  className: string;
}): VNode {
  return (
    <span
      class={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-bold ${className}`}
    >
      {children}
    </span>
  );
}

function NavLink({ href, children }: { href: string; children: ComponentChildren }): VNode {
  return (
    <a
      class="rounded-lg px-3 py-1.5 text-[var(--muted-strong)] hover:bg-[var(--panel)] hover:text-[var(--accent)]"
      href={href}
    >
      {children}
    </a>
  );
}
