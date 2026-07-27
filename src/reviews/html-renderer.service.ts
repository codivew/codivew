import { Injectable } from '@nestjs/common';
import { escapeHtml } from '../common/utils/escape-html';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { FilteredDiffResult } from './diff-filter.service';
import type { ReviewIssue, ReviewResult, ReviewSeverity } from './types/review-result';
import { parseUnifiedDiff, type ParsedDiffFile, type ParsedDiffLine } from './unified-diff';

export type ReviewRenderContext = {
  reviewId: string;
  createdAt: Date;
  elapsedMs: number;
  model: string;
  publicUrl: string;
  request: CreateReviewDto;
  filtered: FilteredDiffResult;
  result: ReviewResult;
};

const severityLabels: Record<ReviewSeverity, string> = {
  must_fix: '필수 수정',
  should_fix: '수정 권장',
  suggestion: '제안',
};

@Injectable()
export class HtmlRendererService {
  render(context: ReviewRenderContext): string {
    const { result, request, filtered } = context;
    const parsedDiff = parseUnifiedDiff(filtered.diff);
    const counts = {
      must_fix: result.issues.filter((issue) => issue.severity === 'must_fix').length,
      should_fix: result.issues.filter((issue) => issue.severity === 'should_fix').length,
      suggestion: result.issues.filter((issue) => issue.severity === 'suggestion').length,
    };
    const verdict = { approve: '승인', comment: '확인 필요', request_changes: '수정 필요' }[
      result.verdict
    ];
    const risk = { low: '낮음', medium: '보통', high: '높음' }[result.risk];
    const title = `Code Review - ${request.repository} - ${context.reviewId}`;

    return `<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:light dark;--bg:#f4f6f8;--panel:#fff;--text:#18212f;--muted:#667085;--line:#d8dee8;--accent:#3157d5;--must:#b42318;--should:#b54708;--suggest:#175cd3;--code:#101828;--add-bg:#eaf8ef;--add-line:#b7e4c7;--del-bg:#fff0f0;--del-line:#ffc9c9;--hunk-bg:#eef3ff}
@media(prefers-color-scheme:dark){:root{--bg:#10141c;--panel:#191f2a;--text:#ecf0f6;--muted:#aab4c4;--line:#344054;--accent:#8aa4ff;--must:#ff8a80;--should:#ffca80;--suggest:#84adff;--code:#0b0f15;--add-bg:#142c21;--add-line:#285c3d;--del-bg:#351b20;--del-line:#6d3038;--hunk-bg:#202a40}}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1280px;margin:auto;padding:24px 20px 64px}header,.panel,.issue,.diff-file{background:var(--panel);border:1px solid var(--line);border-radius:14px;margin-bottom:14px}header,.panel,.issue{padding:18px}h1,h2,h3{line-height:1.25;margin:0 0 10px}h1{font-size:28px}h2{font-size:20px;margin-top:24px}.muted{color:var(--muted)}.badge{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:2px 9px;font-weight:700}.overview-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,1fr);gap:14px}.overview-layout .panel{margin-bottom:0}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.metric{padding:10px;border:1px solid var(--line);border-radius:10px}.metric b{display:block;font-size:18px}.meta{display:grid;grid-template-columns:130px 1fr;gap:5px 14px}.path{overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.issue.must_fix{border-left:5px solid var(--must)}.issue.should_fix{border-left:5px solid var(--should)}.issue.suggestion{border-left:5px solid var(--suggest)}.issue p{white-space:pre-wrap}.issue dl{margin:10px 0}.issue dt{font-weight:700}.issue dd{margin:0 0 9px;white-space:pre-wrap}.issue-location{display:inline-block;margin:2px 0 12px;color:var(--accent);font:600 13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;text-decoration:none}.issue-location:hover{text-decoration:underline}pre{background:var(--code);color:#f5f7fa;border-radius:9px;overflow-x:auto;padding:14px}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.empty{padding:18px;border:1px dashed var(--line);border-radius:10px;color:var(--muted)}ul{padding-left:22px}.diff-file{overflow:hidden;scroll-margin-top:16px}.diff-file-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 16px;border-bottom:1px solid var(--line);font-weight:700}.diff-file-header code{overflow-wrap:anywhere}.diff-scroll{overflow-x:auto}.diff-table{width:100%;min-width:640px;border-collapse:collapse;table-layout:fixed;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.diff-table .line-col{width:54px}.diff-table .sign-col{width:28px}.diff-table td{padding:0;border:0;vertical-align:top}.diff-table .line-no{padding:1px 8px;text-align:right;color:var(--muted);background:color-mix(in srgb,var(--panel) 92%,var(--line));border-right:1px solid var(--line);user-select:none}.diff-table .sign{padding:1px 8px;text-align:center;user-select:none}.diff-table .code-line{padding:1px 12px;white-space:pre;overflow:visible}.diff-table tr.addition{background:var(--add-bg)}.diff-table tr.addition .line-no,.diff-table tr.addition .sign{background:var(--add-line)}.diff-table tr.deletion{background:var(--del-bg)}.diff-table tr.deletion .line-no,.diff-table tr.deletion .sign{background:var(--del-line)}.diff-table .hunk td{padding:5px 12px;background:var(--hunk-bg);color:var(--accent)}.diff-table .marker td{padding:2px 12px;color:var(--muted);font-style:italic}.inline-feedback td{padding:10px 14px 12px 150px;background:var(--panel);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.inline-note{padding:10px 12px;border-left:4px solid var(--accent);border-radius:8px;background:var(--bg);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.inline-note+.inline-note{margin-top:8px}.inline-note a{color:var(--accent);font-weight:700;text-decoration:none}.inline-note p{margin:5px 0 0;white-space:pre-wrap}.diff-meta{margin:0;padding:10px 16px;border-bottom:1px solid var(--line);color:var(--muted);white-space:pre-wrap;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}@media(max-width:900px){.overview-layout{grid-template-columns:1fr}.overview-layout .panel{margin-bottom:0}}@media(max-width:700px){.wrap{padding:16px 12px 40px}.grid{grid-template-columns:1fr}.meta{grid-template-columns:1fr}.meta dt{font-weight:700}.meta dd{margin:0 0 8px}.diff-table .line-col{width:42px}.inline-feedback td{padding-left:12px}}@media print{body{background:#fff;color:#000}.wrap{max-width:none;padding:0}.panel,.issue,header,.diff-file{break-inside:avoid;box-shadow:none}}
</style></head><body><main class="wrap">
<header><div class="muted">AI Code Review</div><h1>${escapeHtml(request.repository)}</h1><span class="badge">${verdict}</span> <span class="badge">위험도 ${risk}</span></header>
<div class="overview-layout"><section class="panel"><h2>전체 판정</h2><div class="grid">
${this.metric('필수 수정', counts.must_fix)}${this.metric('수정 권장', counts.should_fix)}${this.metric('제안', counts.suggestion)}
</div></section>
<section class="panel"><h2>변경 정보</h2><dl class="meta">
${this.row('Repository', request.repository)}${this.optionalRow('Base branch', request.baseBranch)}${this.row('Mode', request.mode)}${this.optionalRow('Commit SHA', request.commitSha)}${this.row('Review ID', context.reviewId)}${this.row('Reviewed files', String(filtered.reviewedFiles.length))}
</dl></section></div>
<section class="panel"><h2>리뷰 요약</h2><p>${escapeHtml(result.summary)}</p></section>
${this.section('Must Fix', 'must_fix', result.issues, parsedDiff)}
${this.section('Should Fix', 'should_fix', result.issues, parsedDiff)}
${this.section('Suggestions', 'suggestion', result.issues, parsedDiff)}
<section><h2>변경 코드</h2>${this.diff(parsedDiff, result.issues)}</section>
<section class="panel"><h2>권장 테스트</h2>${result.tests.length === 0 ? '<p class="empty">권장 테스트가 없습니다.</p>' : `<ul>${result.tests.map((test) => `<li>${escapeHtml(test)}</li>`).join('')}</ul>`}</section>
<section class="panel"><h2>생성 정보</h2><dl class="meta">${this.row('공개 URL', context.publicUrl, 'path')}${this.row('생성 시각', context.createdAt.toISOString())}${this.row('처리 시간', `${context.elapsedMs}ms`)}${this.row('모델', context.model)}</dl></section>
</main></body></html>`;
  }

  private section(
    title: string,
    severity: ReviewSeverity,
    issues: ReviewIssue[],
    files: ParsedDiffFile[],
  ): string {
    const matches = issues.filter((issue) => issue.severity === severity);
    return `<section><h2>${title}</h2>${matches.length === 0 ? '<p class="empty">발견된 항목이 없습니다.</p>' : matches.map((issue) => this.issue(issue, issues.indexOf(issue), files)).join('')}</section>`;
  }

  private issue(issue: ReviewIssue, issueIndex: number, files: ParsedDiffFile[]): string {
    const line =
      issue.endLine === undefined || issue.endLine === issue.line
        ? String(issue.line)
        : `${issue.line}-${issue.endLine}`;
    const location = `${issue.file} · ${line}번째 줄`;
    const target = this.diffTarget(issue, files);
    const locationHtml =
      target === undefined
        ? `<span class="issue-location">${escapeHtml(location)}</span>`
        : `<a class="issue-location" href="#${target}">${escapeHtml(location)} → 코드 보기</a>`;
    return `<article class="issue ${issue.severity}" id="feedback-${issueIndex}"><span class="badge">${severityLabels[issue.severity]}</span><h3>${escapeHtml(issue.title)}</h3>${locationHtml}<dl>
${this.row('신뢰도', `${Math.round(issue.confidence * 100)}%`)}${this.row('설명', issue.description)}${this.optionalRow('영향', issue.impact)}${this.optionalRow('수정 제안', issue.suggestion)}
</dl>${issue.codeSnippet === undefined ? '' : `<pre><code>${escapeHtml(issue.codeSnippet)}</code></pre>`}</article>`;
  }

  private diff(files: ParsedDiffFile[], issues: ReviewIssue[]): string {
    if (files.length === 0) return '<p class="empty">표시할 Diff가 없습니다.</p>';
    return files.map((file, fileIndex) => this.diffFile(file, fileIndex, issues)).join('');
  }

  private diffFile(file: ParsedDiffFile, fileIndex: number, issues: ReviewIssue[]): string {
    const fileIssues = issues.filter((issue) => this.samePath(issue.file, file.path));
    const metadata =
      file.metadata.length === 0
        ? ''
        : `<pre class="diff-meta">${escapeHtml(file.metadata.join('\n'))}</pre>`;
    const rows = file.hunks
      .map(
        (hunk) =>
          `<tr class="hunk"><td colspan="4">${escapeHtml(hunk.header)}</td></tr>${hunk.lines.map((line) => this.diffLine(line, fileIndex, fileIssues, issues)).join('')}`,
      )
      .join('');
    const body =
      rows.length === 0
        ? '<div class="empty">텍스트로 표시할 변경 라인이 없습니다.</div>'
        : `<div class="diff-scroll"><table class="diff-table"><colgroup><col class="line-col"><col class="line-col"><col class="sign-col"><col></colgroup><tbody>${rows}</tbody></table></div>`;
    return `<article class="diff-file" id="diff-file-${fileIndex}"><div class="diff-file-header"><code>${escapeHtml(file.path)}</code><span class="muted">피드백 ${fileIssues.length}개</span></div>${metadata}${body}</article>`;
  }

  private diffLine(
    line: ParsedDiffLine,
    fileIndex: number,
    fileIssues: ReviewIssue[],
    allIssues: ReviewIssue[],
  ): string {
    if (line.kind === 'marker') {
      return `<tr class="marker"><td colspan="4">${escapeHtml(line.content)}</td></tr>`;
    }
    const sign = { context: ' ', addition: '+', deletion: '-' }[line.kind];
    const target =
      line.newLine === undefined ? '' : ` id="${this.lineTarget(fileIndex, line.newLine)}"`;
    const row = `<tr class="${line.kind}"${target}><td class="line-no">${line.oldLine ?? ''}</td><td class="line-no">${line.newLine ?? ''}</td><td class="sign">${sign}</td><td class="code-line">${escapeHtml(line.content) || ' '}</td></tr>`;
    if (line.newLine === undefined) return row;

    const attached = fileIssues.filter((issue) => issue.line === line.newLine);
    if (attached.length === 0) return row;
    return `${row}<tr class="inline-feedback"><td colspan="4">${attached
      .map((issue) => {
        const issueIndex = allIssues.indexOf(issue);
        return `<div class="inline-note"><a href="#feedback-${issueIndex}">${escapeHtml(issue.title)}</a><span class="muted"> · ${severityLabels[issue.severity]}</span><p>${escapeHtml(issue.description)}</p></div>`;
      })
      .join('')}</td></tr>`;
  }

  private diffTarget(issue: ReviewIssue, files: ParsedDiffFile[]): string | undefined {
    const fileIndex = files.findIndex((file) => this.samePath(file.path, issue.file));
    if (fileIndex === -1) return undefined;
    const hasLine = files[fileIndex].hunks.some((hunk) =>
      hunk.lines.some((line) => line.newLine === issue.line),
    );
    return hasLine ? this.lineTarget(fileIndex, issue.line) : `diff-file-${fileIndex}`;
  }

  private lineTarget(fileIndex: number, line: number): string {
    return `diff-${fileIndex}-L${line}`;
  }

  private samePath(left: string, right: string): boolean {
    return left.replaceAll('\\', '/') === right.replaceAll('\\', '/');
  }

  private metric(label: string, value: number): string {
    return `<div class="metric"><span>${label}</span><b>${value}</b></div>`;
  }

  private row(label: string, value: string, className = ''): string {
    return `<dt>${escapeHtml(label)}</dt><dd class="${className}">${escapeHtml(value)}</dd>`;
  }

  private optionalRow(label: string, value?: string): string {
    return value === undefined || value.length === 0 ? '' : this.row(label, value);
  }
}
