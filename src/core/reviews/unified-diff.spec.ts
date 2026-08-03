import { calculateDiffStats, parseUnifiedDiff } from './unified-diff.js';

describe('parseUnifiedDiff', () => {
  it('parses file hunks and old/new line numbers', () => {
    const [file] = parseUnifiedDiff(`diff --git a/src/app.ts b/src/app.ts
index 1111111..2222222 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -10,3 +10,4 @@ export function run() {
 context
-old
+new
+added
 tail
`);

    expect(file.path).toBe('src/app.ts');
    expect(file.metadata).toEqual(['index 1111111..2222222 100644']);
    expect(file.hunks[0].lines).toEqual([
      { kind: 'context', content: 'context', oldLine: 10, newLine: 10 },
      { kind: 'deletion', content: 'old', oldLine: 11 },
      { kind: 'addition', content: 'new', newLine: 11 },
      { kind: 'addition', content: 'added', newLine: 12 },
      { kind: 'context', content: 'tail', oldLine: 12, newLine: 13 },
    ]);
  });

  it('uses the old path for a deleted file', () => {
    const [file] = parseUnifiedDiff(`diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
--- a/src/old.ts
+++ /dev/null
@@ -1 +0,0 @@
-old
`);

    expect(file.path).toBe('src/old.ts');
    expect(file.hunks[0].lines[0]).toEqual({
      kind: 'deletion',
      content: 'old',
      oldLine: 1,
    });
  });

  it('counts changed files, additions, and deletions', () => {
    const stats = calculateDiffStats(`diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,2 +1,3 @@
-old
+new
+added
 context
diff --git a/src/new.ts b/src/new.ts
new file mode 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1 @@
+export const value = true;
`);

    expect(stats).toEqual({
      fileCount: 2,
      additions: 3,
      deletions: 1,
      changedLineCount: 4,
    });
  });
});
