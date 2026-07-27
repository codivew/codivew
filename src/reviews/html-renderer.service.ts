import { Injectable } from '@nestjs/common';
import { escapeHtml } from '../common/utils/escape-html';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { FilteredDiffResult } from './diff-filter.service';
import type { ReviewIssue, ReviewResult, ReviewSeverity } from './types/review-result';

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
:root{color-scheme:light dark;--bg:#f4f6f8;--panel:#fff;--text:#18212f;--muted:#667085;--line:#d8dee8;--accent:#3157d5;--must:#b42318;--should:#b54708;--suggest:#175cd3;--code:#101828}
@media(prefers-color-scheme:dark){:root{--bg:#10141c;--panel:#191f2a;--text:#ecf0f6;--muted:#aab4c4;--line:#344054;--accent:#8aa4ff;--must:#ff8a80;--should:#ffca80;--suggest:#84adff;--code:#0b0f15}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.wrap{max-width:1100px;margin:auto;padding:32px 20px 64px}header,.panel,.issue{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:22px;margin-bottom:18px}h1,h2,h3{line-height:1.25;margin:0 0 12px}h1{font-size:28px}h2{font-size:20px;margin-top:28px}.muted{color:var(--muted)}.badge{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:2px 9px;font-weight:700}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.metric{padding:12px;border:1px solid var(--line);border-radius:10px}.metric b{display:block;font-size:18px}.meta{display:grid;grid-template-columns:160px 1fr;gap:7px 16px}.path{overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.issue.must_fix{border-left:5px solid var(--must)}.issue.should_fix{border-left:5px solid var(--should)}.issue.suggestion{border-left:5px solid var(--suggest)}.issue p{white-space:pre-wrap}.issue dl{margin:10px 0}.issue dt{font-weight:700}.issue dd{margin:0 0 9px;white-space:pre-wrap}pre{background:var(--code);color:#f5f7fa;border-radius:9px;overflow-x:auto;padding:14px}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.empty{padding:18px;border:1px dashed var(--line);border-radius:10px;color:var(--muted)}ul{padding-left:22px}@media(max-width:700px){.wrap{padding:16px 12px 40px}.grid{grid-template-columns:1fr}.meta{grid-template-columns:1fr}.meta dt{font-weight:700}.meta dd{margin:0 0 8px}}@media print{body{background:#fff;color:#000}.wrap{max-width:none;padding:0}.panel,.issue,header{break-inside:avoid;box-shadow:none}}
</style></head><body><main class="wrap">
<header><div class="muted">AI Code Review</div><h1>${escapeHtml(request.repository)}</h1><span class="badge">${verdict}</span> <span class="badge">위험도 ${risk}</span></header>
<section class="panel"><h2>전체 판정</h2><div class="grid">
${this.metric('필수 수정', counts.must_fix)}${this.metric('수정 권장', counts.should_fix)}${this.metric('제안', counts.suggestion)}
</div></section>
<section class="panel"><h2>변경 정보</h2><dl class="meta">
${this.row('Repository', request.repository)}${this.optionalRow('Base branch', request.baseBranch)}${this.row('Mode', request.mode)}${this.optionalRow('Commit SHA', request.commitSha)}${this.row('Review ID', context.reviewId)}${this.row('Reviewed files', String(filtered.reviewedFiles.length))}
</dl></section>
<section class="panel"><h2>리뷰 요약</h2><p>${escapeHtml(result.summary)}</p></section>
${this.section('Must Fix', 'must_fix', result.issues)}
${this.section('Should Fix', 'should_fix', result.issues)}
${this.section('Suggestions', 'suggestion', result.issues)}
<section class="panel"><h2>권장 테스트</h2>${result.tests.length === 0 ? '<p class="empty">권장 테스트가 없습니다.</p>' : `<ul>${result.tests.map((test) => `<li>${escapeHtml(test)}</li>`).join('')}</ul>`}</section>
<section class="panel"><h2>생성 정보</h2><dl class="meta">${this.row('공개 URL', context.publicUrl, 'path')}${this.row('생성 시각', context.createdAt.toISOString())}${this.row('처리 시간', `${context.elapsedMs}ms`)}${this.row('모델', context.model)}</dl></section>
</main></body></html>`;
  }

  private section(title: string, severity: ReviewSeverity, issues: ReviewIssue[]): string {
    const matches = issues.filter((issue) => issue.severity === severity);
    return `<section><h2>${title}</h2>${matches.length === 0 ? '<p class="empty">발견된 항목이 없습니다.</p>' : matches.map((issue) => this.issue(issue)).join('')}</section>`;
  }

  private issue(issue: ReviewIssue): string {
    const line =
      issue.line === undefined
        ? undefined
        : issue.endLine === undefined || issue.endLine === issue.line
          ? String(issue.line)
          : `${issue.line}-${issue.endLine}`;
    return `<article class="issue ${issue.severity}"><span class="badge">${severityLabels[issue.severity]}</span><h3>${escapeHtml(issue.title)}</h3><dl>
${this.row('신뢰도', `${Math.round(issue.confidence * 100)}%`)}${this.row('파일', issue.file, 'path')}${this.optionalRow('라인', line)}${this.row('설명', issue.description)}${this.optionalRow('영향', issue.impact)}${this.optionalRow('수정 제안', issue.suggestion)}
</dl>${issue.codeSnippet === undefined ? '' : `<pre><code>${escapeHtml(issue.codeSnippet)}</code></pre>`}</article>`;
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
