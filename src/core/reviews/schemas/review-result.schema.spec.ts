import { parseReviewResult, reviewResultJsonSchema } from './review-result.schema.js';

const valid = {
  verdict: 'comment',
  risk: 'medium',
  summary: '확인이 필요합니다.',
  issues: [
    {
      severity: 'should_fix',
      confidence: 0.9,
      file: 'src/app.ts',
      line: 3,
      endLine: 4,
      title: '오류 처리 누락',
      description: '예외가 처리되지 않습니다.',
    },
  ],
  tests: ['오류 경로 테스트'],
};

describe('reviewResultSchema', () => {
  it('keeps the provider response schema free of broadly unsupported constraint keywords', () => {
    const schema = JSON.stringify(reviewResultJsonSchema);
    expect(schema).not.toMatch(/"(?:minimum|maximum|minLength|maxLength|maxItems)"/);
  });

  it('accepts a valid result', () => {
    expect(parseReviewResult(valid, ['src/app.ts']).issues).toHaveLength(1);
  });

  it('requires a line in the provider response schema', () => {
    expect(reviewResultJsonSchema.properties.issues.items.required).toContain('line');
  });

  it('normalizes verdicts to match reported issues', () => {
    expect(parseReviewResult({ ...valid, verdict: 'approve' }, ['src/app.ts']).verdict).toBe(
      'comment',
    );
    expect(
      parseReviewResult(
        {
          ...valid,
          verdict: 'approve',
          issues: [{ ...valid.issues[0], severity: 'must_fix' }],
        },
        ['src/app.ts'],
      ).verdict,
    ).toBe('request_changes');
  });

  it('rejects a line outside the new side of the diff', () => {
    const diff = `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1 @@
-old
+new`;
    expect(() => parseReviewResult(valid, ['src/app.ts'], diff)).toThrow(
      'line must exist on the new side of the reviewed diff',
    );
  });

  it.each([
    [{ ...valid.issues[0], confidence: 2 }],
    [{ ...valid.issues[0], title: '' }],
    [{ ...valid.issues[0], line: undefined, endLine: 2 }],
    [{ ...valid.issues[0], line: 4, endLine: 2 }],
    [{ ...valid.issues[0], file: 'src/missing.ts' }],
  ])('rejects invalid issues', (issues) => {
    expect(() => parseReviewResult({ ...valid, issues }, ['src/app.ts'])).toThrow();
  });

  it('rejects more than 100 issues', () => {
    expect(() =>
      parseReviewResult({ ...valid, issues: Array.from({ length: 101 }, () => valid.issues[0]) }, [
        'src/app.ts',
      ]),
    ).toThrow();
  });
});
