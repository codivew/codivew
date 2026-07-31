import type { VNode } from 'preact';
import type { ReviewIssue } from '../../reviews/types/review-result.js';
import type { ParsedDiffFile, ParsedDiffLine } from '../../reviews/unified-diff.js';
import { lineTarget, samePath, severityLabels } from './issue-sections.js';
import { Empty, SectionHeader, SURFACE_CLASSES } from './report-ui.js';

const COLLAPSED_DIFF_LINE_THRESHOLD = 40;
const DIFF_ROW_CLASSES = {
  context: '',
  addition: 'bg-[var(--add-bg)]',
  deletion: 'bg-[var(--del-bg)]',
};
const DIFF_GUTTER_CLASSES = {
  context: 'bg-[color-mix(in_srgb,var(--panel)_92%,var(--line))]',
  addition: 'bg-[var(--add-line)]',
  deletion: 'bg-[var(--del-line)]',
};

export function ReviewDiff({
  files,
  issues,
}: {
  files: ParsedDiffFile[];
  issues: ReviewIssue[];
}): VNode {
  return (
    <section id="changed-code" class="scroll-mt-5">
      <SectionHeader
        eyebrow="Source changes"
        title="변경 코드"
        description={`${files.length}개 파일의 변경사항과 인라인 피드백입니다.`}
      />
      <Diff files={files} issues={issues} />
    </section>
  );
}

function Diff({ files, issues }: { files: ParsedDiffFile[]; issues: ReviewIssue[] }): VNode {
  if (files.length === 0) return <Empty>표시할 Diff가 없습니다.</Empty>;

  return (
    <>
      {files.map((file, fileIndex) => (
        <DiffFile
          key={`${file.path}-${fileIndex}`}
          file={file}
          fileIndex={fileIndex}
          issues={issues}
        />
      ))}
    </>
  );
}

function DiffFile({
  file,
  fileIndex,
  issues,
}: {
  file: ParsedDiffFile;
  fileIndex: number;
  issues: ReviewIssue[];
}): VNode {
  const fileIssues = issues.filter((issue) => samePath(issue.file, file.path));
  const displayedLineCount = file.hunks.reduce((count, hunk) => count + hunk.lines.length, 0);
  const changedLineCount = file.hunks.reduce(
    (count, hunk) =>
      count +
      hunk.lines.filter((line) => line.kind === 'addition' || line.kind === 'deletion').length,
    0,
  );
  const hasRows = file.hunks.some((hunk) => hunk.lines.length > 0);

  return (
    <details
      class={`diff-file group ${SURFACE_CLASSES} scroll-mt-5 overflow-hidden`}
      id={`diff-file-${fileIndex}`}
      open={displayedLineCount <= COLLAPSED_DIFF_LINE_THRESHOLD}
    >
      <summary class="diff-file-header flex cursor-pointer list-none items-center gap-4 border-b-0 bg-[var(--panel-subtle)] px-5 py-4 group-open:border-b group-open:border-[var(--line)] max-[700px]:flex-wrap max-[700px]:gap-2.5 max-[700px]:px-4 [&::-webkit-details-marker]:hidden">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[var(--panel)] font-mono text-xs font-bold text-[var(--accent)]">
          {'</>'}
        </span>
        <code class="min-w-0 flex-1 font-mono text-[13px] font-bold [overflow-wrap:anywhere]">
          {file.path}
        </code>
        <div class="flex items-center gap-2 max-[700px]:order-3 max-[700px]:w-full max-[700px]:pl-10">
          <span class="rounded-full bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-strong)] ring-1 ring-[var(--line)]">
            변경 {changedLineCount}줄
          </span>
          <span class="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--accent)]">
            피드백 {fileIssues.length}개
          </span>
        </div>
        <span class="rounded-lg px-2 py-1 text-[12px] font-bold text-[var(--accent)] group-open:hidden">
          펼치기 ↓
        </span>
        <span class="hidden rounded-lg px-2 py-1 text-[12px] font-bold text-[var(--accent)] group-open:inline">
          접기 ↑
        </span>
      </summary>
      {file.metadata.length === 0 ? null : (
        <pre class="m-0 whitespace-pre-wrap border-b border-[var(--line)] bg-[var(--panel-subtle)] px-5 py-3 font-mono text-[11px]/[1.5] text-[var(--muted)]">
          {file.metadata.join('\n')}
        </pre>
      )}
      {hasRows ? (
        <div class="diff-scroll overflow-x-auto">
          <table class="diff-table w-full min-w-[680px] table-fixed border-collapse font-mono text-[12.5px]/[1.65]">
            <colgroup>
              <col class="line-col w-[54px] max-[700px]:w-[42px]" />
              <col class="line-col w-[54px] max-[700px]:w-[42px]" />
              <col class="sign-col w-7" />
              <col />
            </colgroup>
            <tbody>
              {file.hunks.map((hunk, hunkIndex) => (
                <>
                  <tr class="hunk" key={`${hunk.header}-${hunkIndex}`}>
                    <td
                      class="border-y border-[var(--line)] bg-[var(--hunk-bg)] px-4 py-2 text-[var(--accent)]"
                      colSpan={4}
                    >
                      {hunk.header}
                    </td>
                  </tr>
                  {hunk.lines.map((line, lineIndex) => (
                    <DiffLine
                      key={`${hunkIndex}-${lineIndex}`}
                      line={line}
                      fileIndex={fileIndex}
                      fileIssues={fileIssues}
                      allIssues={issues}
                    />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div class="rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--panel-subtle)] px-5 py-7 text-center text-[var(--muted)]">
          텍스트로 표시할 변경 라인이 없습니다.
        </div>
      )}
    </details>
  );
}

function DiffLine({
  line,
  fileIndex,
  fileIssues,
  allIssues,
}: {
  line: ParsedDiffLine;
  fileIndex: number;
  fileIssues: ReviewIssue[];
  allIssues: ReviewIssue[];
}): VNode {
  if (line.kind === 'marker') {
    return (
      <tr class="marker">
        <td class="px-4 py-1 text-[var(--muted)] italic" colSpan={4}>
          {line.content}
        </td>
      </tr>
    );
  }

  const sign = { context: ' ', addition: '+', deletion: '-' }[line.kind];
  const gutterClasses = `${DIFF_GUTTER_CLASSES[line.kind]} border-r border-[var(--line)] px-2 py-[2px] text-right text-[var(--muted)] select-none`;
  const attached =
    line.newLine === undefined ? [] : fileIssues.filter((issue) => issue.line === line.newLine);

  return (
    <>
      <tr
        class={`${line.kind} ${DIFF_ROW_CLASSES[line.kind]}`}
        id={line.newLine === undefined ? undefined : lineTarget(fileIndex, line.newLine)}
      >
        <td class={`line-no ${gutterClasses}`}>{line.oldLine}</td>
        <td class={`line-no ${gutterClasses}`}>{line.newLine}</td>
        <td
          class={`sign ${DIFF_GUTTER_CLASSES[line.kind]} px-2 py-[2px] text-center font-bold select-none`}
        >
          {sign}
        </td>
        <td class="code-line overflow-visible px-4 py-[2px] whitespace-pre">
          {line.content || ' '}
        </td>
      </tr>
      {attached.length === 0 ? null : (
        <tr class="inline-feedback">
          <td
            class="border-y border-[var(--line)] bg-[var(--panel)] px-4 py-3 pl-[150px] max-[700px]:pl-4"
            colSpan={4}
          >
            {attached.map((issue) => {
              const issueIndex = allIssues.indexOf(issue);
              return (
                <a
                  key={issueIndex}
                  class="inline-note flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2.5 font-sans text-[var(--text)] no-underline hover:border-[var(--accent)] max-[700px]:flex-wrap max-[700px]:items-start [&+&]:mt-2"
                  href={`#feedback-${issueIndex}`}
                >
                  <span class="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[11px] text-white">
                    ↳
                  </span>
                  <span class="whitespace-nowrap text-xs font-bold text-[var(--accent)]">
                    {severityLabels[issue.severity]}
                  </span>
                  <span class="flex-1 text-[13px] font-bold max-[700px]:basis-[calc(100%_-_110px)]">
                    {issue.title}
                  </span>
                  <span class="whitespace-nowrap text-xs font-semibold text-[var(--accent)] max-[700px]:ml-[30px]">
                    상세 보기 ↑
                  </span>
                </a>
              );
            })}
          </td>
        </tr>
      )}
    </>
  );
}
