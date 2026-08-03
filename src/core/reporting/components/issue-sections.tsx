import type { VNode } from 'preact';
import { t } from '../../config/language.js';
import type { ReviewIssue, ReviewSeverity } from '../../reviews/types/review-result.js';
import type { ParsedDiffFile } from '../../reviews/unified-diff.js';
import { Empty, SectionHeader, SURFACE_CLASSES } from './report-ui.js';

export function severityLabel(severity: ReviewSeverity): string {
  return {
    must_fix: t('report.severity.mustFix'),
    should_fix: t('report.severity.shouldFix'),
    suggestion: t('report.severity.suggestion'),
  }[severity];
}

const ISSUE_BORDER_CLASSES: Record<ReviewSeverity, string> = {
  must_fix: 'border-t-[3px] border-t-[var(--must)]',
  should_fix: 'border-t-[3px] border-t-[var(--should)]',
  suggestion: 'border-t-[3px] border-t-[var(--suggest)]',
};
const SEVERITY_BADGE_CLASSES: Record<ReviewSeverity, string> = {
  must_fix: 'border-[var(--must)] bg-[var(--must-soft)] text-[var(--must)]',
  should_fix: 'border-[var(--should)] bg-[var(--should-soft)] text-[var(--should)]',
  suggestion: 'border-[var(--suggest)] bg-[var(--suggest-soft)] text-[var(--suggest)]',
};

export function IssueSections({
  issues,
  files,
}: {
  issues: ReviewIssue[];
  files: ParsedDiffFile[];
}): VNode {
  if (issues.length === 0) {
    return (
      <section id="review-issues" class="scroll-mt-5">
        <SectionHeader
          eyebrow="Review findings"
          title={t('report.reviewItems')}
          description={t('report.noIssuesDescription')}
          count={0}
        />
        <Empty>{t('report.noIssues')}</Empty>
      </section>
    );
  }

  return (
    <div id="review-issues" class="scroll-mt-5">
      <IssueSection
        title={severityLabel('must_fix')}
        severity="must_fix"
        issues={issues}
        files={files}
      />
      <IssueSection
        title={severityLabel('should_fix')}
        severity="should_fix"
        issues={issues}
        files={files}
      />
      <IssueSection
        title={severityLabel('suggestion')}
        severity="suggestion"
        issues={issues}
        files={files}
      />
    </div>
  );
}

function IssueSection({
  title,
  severity,
  issues,
  files,
}: {
  title: string;
  severity: ReviewSeverity;
  issues: ReviewIssue[];
  files: ParsedDiffFile[];
}): VNode | null {
  const matches = issues.filter((issue) => issue.severity === severity);
  if (matches.length === 0) return null;

  return (
    <section>
      <SectionHeader
        eyebrow={
          severity === 'must_fix'
            ? 'Blocking issues'
            : severity === 'should_fix'
              ? 'Review notes'
              : 'Suggestions'
        }
        title={title}
        description={
          severity === 'must_fix'
            ? t('report.mustFixDescription')
            : severity === 'should_fix'
              ? t('report.shouldFixDescription')
              : t('report.suggestionDescription')
        }
        count={matches.length}
      />
      {matches.map((issue) => (
        <Issue
          key={issues.indexOf(issue)}
          issue={issue}
          issueIndex={issues.indexOf(issue)}
          files={files}
        />
      ))}
    </section>
  );
}

function Issue({
  issue,
  issueIndex,
  files,
}: {
  issue: ReviewIssue;
  issueIndex: number;
  files: ParsedDiffFile[];
}): VNode {
  const line =
    issue.endLine === undefined || issue.endLine === issue.line
      ? String(issue.line)
      : `${issue.line}-${issue.endLine}`;
  const location = t('report.location', { file: issue.file, line });
  const target = diffTarget(issue, files);
  const locationClasses =
    'inline-flex items-center rounded-lg bg-[var(--accent-soft)] px-2.5 py-1.5 font-mono text-[12px]/[1.4] font-semibold text-[var(--accent)] no-underline hover:underline';

  return (
    <article
      class={`issue ${SURFACE_CLASSES} ${ISSUE_BORDER_CLASSES[issue.severity]} scroll-mt-5 overflow-hidden`}
      id={`feedback-${issueIndex}`}
    >
      <div class="p-5 max-[700px]:p-4">
        <div class="mb-3 flex items-center justify-between gap-3">
          <SeverityBadge severity={issue.severity} />
          <span class="text-xs font-semibold text-[var(--muted)]">
            {t('report.confidence')} {Math.round(issue.confidence * 100)}%
          </span>
        </div>
        <h3 class="mb-3 text-[19px]/6 font-bold tracking-[-0.02em]">{issue.title}</h3>
        {target === undefined ? (
          <span class={locationClasses}>{location}</span>
        ) : (
          <a class={locationClasses} href={`#${target}`}>
            {location} <span class="ml-1">{t('report.viewCode')}</span>
          </a>
        )}
        <dl class="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-subtle)]">
          <IssueRow label={t('report.description')} value={issue.description} />
          <OptionalIssueRow label={t('report.impact')} value={issue.impact} />
          <OptionalIssueRow label={t('report.suggestion')} value={issue.suggestion} />
        </dl>
        {issue.codeSnippet === undefined ? null : (
          <pre class="mt-4 overflow-x-auto rounded-xl border border-white/5 bg-[var(--code)] p-4 text-[13px]/[1.65] text-[var(--code-text)] shadow-inner">
            <code class="font-mono">{issue.codeSnippet}</code>
          </pre>
        )}
      </div>
    </article>
  );
}

function SeverityBadge({ severity }: { severity: ReviewSeverity }): VNode {
  return (
    <span
      class={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${SEVERITY_BADGE_CLASSES[severity]}`}
    >
      <span class="size-1.5 rounded-full bg-current" />
      {severityLabel(severity)}
    </span>
  );
}

function IssueRow({ label, value }: { label: string; value: string }): VNode {
  return (
    <div class="grid grid-cols-[92px_1fr] gap-4 border-b border-[var(--line)] px-4 py-3.5 last:border-b-0 max-[700px]:grid-cols-1 max-[700px]:gap-1">
      <dt class="text-[13px] font-bold text-[var(--muted-strong)]">{label}</dt>
      <dd class="m-0 whitespace-pre-wrap text-[14px]/6">{value}</dd>
    </div>
  );
}

function OptionalIssueRow({ label, value }: { label: string; value?: string }): VNode | null {
  return value === undefined || value.length === 0 ? null : (
    <IssueRow label={label} value={value} />
  );
}

function diffTarget(issue: ReviewIssue, files: ParsedDiffFile[]): string | undefined {
  const fileIndex = files.findIndex((file) => samePath(file.path, issue.file));
  if (fileIndex === -1) return undefined;
  const hasLine = files[fileIndex].hunks.some((hunk) =>
    hunk.lines.some((line) => line.newLine === issue.line),
  );
  return hasLine ? lineTarget(fileIndex, issue.line) : `diff-file-${fileIndex}`;
}

export function lineTarget(fileIndex: number, line: number): string {
  return `diff-${fileIndex}-L${line}`;
}

export function samePath(left: string, right: string): boolean {
  return left.replaceAll('\\', '/') === right.replaceAll('\\', '/');
}
