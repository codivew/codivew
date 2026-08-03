import { ERROR_CODES } from '../common/constants/error-codes.js';
import { ReviewError } from '../common/errors/review-error.js';

export type FilteredDiffResult = {
  diff: string;
  reviewedFiles: string[];
  originalFileCount: number;
  filteredFileCount: number;
  originalCharCount: number;
  filteredCharCount: number;
};

const EXCLUDED_BASENAMES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lock',
  'bun.lockb',
]);
const SENSITIVE_BASENAMES = new Set(['.env', 'id_rsa', 'id_ed25519']);
const ALLOWED_ENV_FILES = new Set(['.env.example', '.env.sample']);
const EXCLUDED_DIRECTORIES = new Set(['dist', 'build', 'coverage', '.next', 'generated']);

export class DiffFilterService {
  filter(rawDiff: string): FilteredDiffResult {
    const normalizedDiff = rawDiff.replaceAll('\r\n', '\n');
    const starts = [...normalizedDiff.matchAll(/^diff --git /gm)].map((match) => match.index);
    const blocks = starts.map((start, index) =>
      normalizedDiff.slice(start, starts[index + 1] ?? normalizedDiff.length).trimEnd(),
    );
    const kept: Array<{ block: string; path: string }> = [];

    for (const block of blocks) {
      const path = this.extractTargetPath(block);
      if (path !== undefined && !this.isExcluded(path)) kept.push({ block, path });
    }

    if (kept.length === 0) {
      throw new ReviewError(ERROR_CODES.EMPTY_DIFF, '리뷰할 수 있는 Diff가 없습니다.');
    }

    const diff = `${kept.map(({ block }) => block).join('\n')}\n`;
    return {
      diff,
      reviewedFiles: [...new Set(kept.map(({ path }) => path))],
      originalFileCount: blocks.length,
      filteredFileCount: blocks.length - kept.length,
      originalCharCount: rawDiff.length,
      filteredCharCount: diff.length,
    };
  }

  private extractTargetPath(block: string): string | undefined {
    const normalize = (path: string): string =>
      path
        .trim()
        .replace(/^"|"$/g, '')
        .replaceAll('\\', '/')
        .replace(/^[ab]\//, '');
    const plusPath = block.match(/^\+\+\+\s+(.+)$/m)?.[1];
    if (plusPath !== undefined && plusPath !== '/dev/null') return normalize(plusPath);
    const minusPath = block.match(/^---\s+(.+)$/m)?.[1];
    if (minusPath !== undefined && minusPath !== '/dev/null') return normalize(minusPath);
    const header = block.match(/^diff --git\s+a[\\/](.+?)\s+b[\\/](.+)$/m);
    return header?.[2] === undefined ? undefined : normalize(header[2]);
  }

  private isExcluded(path: string): boolean {
    const normalized = path.replaceAll('\\', '/');
    const segments = normalized.split('/');
    const basename = segments.at(-1) ?? '';
    if (ALLOWED_ENV_FILES.has(basename)) return false;
    return (
      EXCLUDED_BASENAMES.has(basename) ||
      SENSITIVE_BASENAMES.has(basename) ||
      basename.startsWith('.env.') ||
      /\.(?:pem|key|p12|pfx)$/i.test(basename) ||
      /\.min\.js$/i.test(basename) ||
      /\.map$/i.test(basename) ||
      segments.some((segment) => EXCLUDED_DIRECTORIES.has(segment))
    );
  }
}
