import { setLanguage } from '../config/language.js';
import { HtmlRendererService } from './html-renderer.service.js';
import { ReviewMode } from '../reviews/types/review-request.js';

describe('HtmlRendererService', () => {
  const renderer = new HtmlRendererService();

  afterEach(() => setLanguage('ko-KR'));

  it('renders a standalone escaped review report', async () => {
    const html = await renderer.render({
      reviewId: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      elapsedMs: 42,
      model: 'qwen',
      request: { repository: '<script>alert(1)</script>', mode: ReviewMode.STAGED, diff: 'x' },
      filtered: {
        diff: 'x',
        reviewedFiles: ['src/app.ts'],
        originalFileCount: 1,
        filteredFileCount: 0,
        originalCharCount: 1,
        filteredCharCount: 1,
      },
      result: {
        verdict: 'comment',
        risk: 'medium',
        summary: '<img src=x onerror=alert(1)>',
        issues: [
          {
            severity: 'should_fix',
            confidence: 0.8,
            file: 'src/app.ts',
            line: 1,
            title: '제목',
            description: '설명',
            codeSnippet: '<script>bad()</script>',
          },
        ],
        tests: [],
      },
    });
    expect(html).toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(html).toContain('&lt;script>alert(1)&lt;/script>');
    expect(html).toContain('&lt;img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;script>bad()&lt;/script>');
    expect(html).not.toMatch(/<script[\s>]/i);
    expect(html).not.toMatch(/(?:src|href)=["']https?:/i);
    expect(html).toContain('<style>/*! tailwindcss');
    expect(html).toContain('html body{');
    expect(html).toContain('color:var(--text)!important');
    expect(html).toContain('body.vscode-dark');
  });

  it('renders empty states and omits absent optional fields', async () => {
    const html = await renderer.render({
      reviewId: 'id',
      createdAt: new Date(0),
      elapsedMs: 0,
      model: 'model',
      request: { repository: 'repo', mode: ReviewMode.WORKING, diff: 'x' },
      filtered: {
        diff: 'x',
        reviewedFiles: ['a.ts'],
        originalFileCount: 1,
        filteredFileCount: 0,
        originalCharCount: 1,
        filteredCharCount: 1,
      },
      result: { verdict: 'approve', risk: 'low', summary: '좋습니다.', issues: [], tests: [] },
    });
    expect(html.match(/발견된 문제가 없습니다\./g)).toHaveLength(1);
    expect(html).not.toContain('커밋 SHA</dt>');
    expect(html).toContain('작업 트리');
    expect(html).toMatch(/<dt class="[^"]*">처리 시간<\/dt><dd class="[^"]*">0\.0초<\/dd>/);
  });

  it('renders a numbered diff and links feedback to its code line', async () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -4,2 +4,2 @@
-const value = oldValue;
+const value = newValue;
 return value;
`;
    const html = await renderer.render({
      reviewId: 'id',
      createdAt: new Date(0),
      elapsedMs: 0,
      model: 'model',
      request: { repository: 'repo', mode: ReviewMode.WORKING, diff },
      filtered: {
        diff,
        reviewedFiles: ['src/app.ts'],
        originalFileCount: 1,
        filteredFileCount: 0,
        originalCharCount: diff.length,
        filteredCharCount: diff.length,
      },
      result: {
        verdict: 'comment',
        risk: 'medium',
        summary: '확인이 필요합니다.',
        issues: [
          {
            severity: 'should_fix',
            confidence: 0.9,
            file: 'src/app.ts',
            line: 4,
            title: '값을 확인하세요',
            description: '새 값이 올바른지 확인하세요.',
          },
        ],
        tests: [],
      },
    });

    expect(html).toContain('src/app.ts · 4번째 줄');
    expect(html).toContain('코드 보기 →');
    expect(html).toContain('href="#diff-0-L4"');
    expect(html).toContain('id="diff-0-L4"');
    expect(html).toContain('class="addition ');
    expect(html).toContain('class="deletion ');
    expect(html).toContain('class="inline-feedback"');
    expect(html).toMatch(/<a class="inline-note [^"]+" href="#feedback-0">/);
    expect(html).toContain('href="#feedback-0"');
    expect(html).toContain('상세 보기 ↑');
    expect(html.match(/새 값이 올바른지 확인하세요\./g)).toHaveLength(1);
    expect(html.match(/<col class="line-col /g)).toHaveLength(2);
    expect(html).toContain('class="overview-layout ');
    expect(html).toMatch(/<details class="diff-file [^"]+" id="diff-file-0" open>/);
    expect(html).toContain('변경 2줄');
    expect(html).toContain('피드백 1개');
    expect(html).toContain('class="syntax-token"');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
    expect(html).toMatch(/<h2 class="[^"]+">수정 권장<\/h2>/);
    expect(html).not.toMatch(/<h2 class="[^"]+">필수 수정<\/h2>/);
    expect(html).not.toMatch(/<h2 class="[^"]+">제안<\/h2>/);
  });

  it('collapses long file diffs by default', async () => {
    const additions = Array.from(
      { length: 41 },
      (_, index) => `+const value${index} = ${index};`,
    ).join('\n');
    const diff = `diff --git a/src/large.ts b/src/large.ts
--- a/src/large.ts
+++ b/src/large.ts
@@ -0,0 +1,41 @@
${additions}
`;
    const html = await renderer.render({
      reviewId: 'id',
      createdAt: new Date(0),
      elapsedMs: 0,
      model: 'model',
      request: { repository: 'repo', mode: ReviewMode.WORKING, diff },
      filtered: {
        diff,
        reviewedFiles: ['src/large.ts'],
        originalFileCount: 1,
        filteredFileCount: 0,
        originalCharCount: diff.length,
        filteredCharCount: diff.length,
      },
      result: { verdict: 'approve', risk: 'low', summary: '좋습니다.', issues: [], tests: [] },
    });

    expect(html).toMatch(/<details class="diff-file [^"]+" id="diff-file-0">/);
    expect(html).not.toMatch(/<details class="diff-file [^"]+" id="diff-file-0" open>/);
    expect(html).toContain('변경 41줄');
    expect(html).toContain('피드백 0개');
    expect(html).toContain('<summary class="diff-file-header ');
  });

  it('renders report chrome in English when English is selected', async () => {
    setLanguage('en');
    const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@
-old
+new
`;
    const html = await renderer.render({
      reviewId: 'id',
      createdAt: new Date(0),
      elapsedMs: 100,
      model: 'model',
      request: { repository: 'repo', mode: ReviewMode.STAGED, diff },
      filtered: {
        diff,
        reviewedFiles: ['src/app.ts'],
        originalFileCount: 1,
        filteredFileCount: 0,
        originalCharCount: diff.length,
        filteredCharCount: diff.length,
      },
      result: { verdict: 'approve', risk: 'low', summary: 'Looks good.', issues: [], tests: [] },
    });

    expect(html).toContain('<html lang="en">');
    expect(html).toContain('Review summary');
    expect(html).toContain('No issues found.');
    expect(html).toContain('Changed code');
    expect(html).not.toContain('리뷰 요약');
  });
});
