import { ApiException } from '../common/errors/api-exception';
import { DiffFilterService } from './diff-filter.service';

const block = (path: string, headerPath = path): string =>
  `diff --git a/${headerPath} b/${headerPath}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-old\n+new`;

describe('DiffFilterService', () => {
  const service = new DiffFilterService();

  it('keeps normal TypeScript files', () => {
    const result = service.filter(block('src/app.ts'));
    expect(result.reviewedFiles).toEqual(['src/app.ts']);
    expect(result.filteredFileCount).toBe(0);
  });

  it.each([
    'pnpm-lock.yaml',
    'package-lock.json',
    'dist/app.js',
    '.next/server/app.js',
    '.env',
    '.env.local',
    'cert.pem',
    'private.key',
    'assets/app.min.js',
    'assets/app.js.map',
  ])('removes excluded file %s', (path) => {
    expect(() => service.filter(block(path))).toThrow(ApiException);
  });

  it.each(['.env.example', '.env.sample'])('keeps allowed environment template %s', (path) => {
    expect(service.filter(block(path)).reviewedFiles).toEqual([path]);
  });

  it('removes only excluded blocks from a multi-file diff', () => {
    const result = service.filter(`${block('src/app.ts')}\n${block('pnpm-lock.yaml')}`);
    expect(result.reviewedFiles).toEqual(['src/app.ts']);
    expect(result.originalFileCount).toBe(2);
    expect(result.filteredFileCount).toBe(1);
    expect(result.diff).not.toContain('pnpm-lock.yaml');
  });

  it('uses the renamed target path', () => {
    const diff = `diff --git a/src/old.ts b/src/new.ts\nsimilarity index 100%\nrename from src/old.ts\nrename to src/new.ts`;
    expect(service.filter(diff).reviewedFiles).toEqual(['src/new.ts']);
  });

  it('uses the old path for a deleted file', () => {
    const diff = `diff --git a/src/old.ts b/src/old.ts\ndeleted file mode 100644\n--- a/src/old.ts\n+++ /dev/null`;
    expect(service.filter(diff).reviewedFiles).toEqual(['src/old.ts']);
  });

  it('normalizes Windows path separators', () => {
    const diff = `diff --git a\\src\\app.ts b\\src\\app.ts\n--- a\\src\\app.ts\n+++ b\\src\\app.ts\n@@ -1 +1 @@`;
    expect(service.filter(diff).reviewedFiles).toEqual(['src/app.ts']);
  });
});
