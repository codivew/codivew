import { ReviewMode } from './dto/create-review.dto';
import { HtmlRendererService } from './html-renderer.service';

describe('HtmlRendererService', () => {
  const renderer = new HtmlRendererService();

  it('renders a standalone escaped review report', () => {
    const html = renderer.render({
      reviewId: '550e8400-e29b-41d4-a716-446655440000',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      elapsedMs: 42,
      model: 'qwen',
      publicUrl: 'https://reviews.test/result/report-id',
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
            title: '제목',
            description: '설명',
            codeSnippet: '<script>bad()</script>',
          },
        ],
        tests: [],
      },
    });
    expect(html).toContain('550e8400-e29b-41d4-a716-446655440000');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(html).not.toMatch(/<script[\s>]/i);
    expect(html).not.toMatch(/(?:src|href)=["']https?:/i);
  });

  it('renders empty states and omits absent optional fields', () => {
    const html = renderer.render({
      reviewId: 'id',
      createdAt: new Date(0),
      elapsedMs: 0,
      model: 'model',
      publicUrl: 'https://reviews.test/result/test-id',
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
    expect(html.match(/발견된 항목이 없습니다\./g)).toHaveLength(3);
    expect(html).not.toContain('Commit SHA</dt>');
  });

  it('renders a numbered diff and links feedback to its code line', () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -4,2 +4,2 @@
-const value = oldValue;
+const value = newValue;
 return value;
`;
    const html = renderer.render({
      reviewId: 'id',
      createdAt: new Date(0),
      elapsedMs: 0,
      model: 'model',
      publicUrl: 'https://reviews.test/result/test-id',
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

    expect(html).toContain('src/app.ts · 4번째 줄 → 코드 보기');
    expect(html).toContain('href="#diff-0-L4"');
    expect(html).toContain('id="diff-0-L4"');
    expect(html).toContain('class="addition"');
    expect(html).toContain('class="deletion"');
    expect(html).toContain('class="inline-feedback"');
    expect(html).toContain('href="#feedback-0"');
  });
});
