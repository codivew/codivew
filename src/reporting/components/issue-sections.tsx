import type { VNode } from 'preact';
import type { ReviewIssue, ReviewSeverity } from '../../reviews/types/review-result.js';
import type { ParsedDiffFile } from '../../reviews/unified-diff.js';
import { Empty, SectionHeader, SURFACE_CLASSES } from './report-ui.js';

export const severityLabels: Record<ReviewSeverity, string> = {
  must_fix: '필수 수정',
  should_fix: '수정 권장',
  suggestion: '제안',
};

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
          title="리뷰 항목"
          description="검토 범위에서 차단 또는 개선 항목이 확인되지 않았습니다."
          count={0}
        />
        <Empty>발견된 문제가 없습니다.</Empty>
      </section>
    );
  }

  return (
    <div id="review-issues" class="scroll-mt-5">
      <IssueSection title="필수 수정" severity="must_fix" issues={issues} files={files} />
      <IssueSection title="수정 권장" severity="should_fix" issues={issues} files={files} />
      <IssueSection title="제안" severity="suggestion" issues={issues} files={files} />
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
            ? '병합 전에 반드시 해결해야 하는 항목입니다.'
            : severity === 'should_fix'
              ? '안정성과 유지보수성을 위해 확인을 권장합니다.'
              : '코드 품질을 더 높일 수 있는 개선 제안입니다.'
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
  const location = `${issue.file} · ${line}번째 줄`;
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
            신뢰도 {Math.round(issue.confidence * 100)}%
          </span>
        </div>
        <h3 class="mb-3 text-[19px]/6 font-bold tracking-[-0.02em]">{issue.title}</h3>
        {target === undefined ? (
          <span class={locationClasses}>{location}</span>
        ) : (
          <a class={locationClasses} href={`#${target}`}>
            {location} <span class="ml-1">코드 보기 →</span>
          </a>
        )}
        <dl class="mt-4 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-subtle)]">
          <IssueRow label="설명" value={issue.description} />
          <OptionalIssueRow label="영향" value={issue.impact} />
          <OptionalIssueRow label="수정 제안" value={issue.suggestion} />
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
      {severityLabels[severity]}
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
